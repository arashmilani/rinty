require('./config').init()

const { Client } = require('pg')
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const { mkdirSync, unlinkSync } = fs
const crypto = require('crypto')
const zlib = require('zlib')
const rotation = require('rotation')
const { Transform } = require('stream')
const { upload } = require('./upload-handlers/' +
  process.env.UPLOAD_HANDLER_PROVIDER)

const backupDirectoryPath = path.join(__dirname, 'backups')

const ONE_HOUR_IN_MILLISECONDS = 60 * 60 * 1000
lastBackupRotation = null

init().catch((err) => {
  shout(err)
  process.exit(1)
})

async function init() {
  let timestamp
  let currentRotation = rotation()
  if (lastBackupRotation !== currentRotation) {
    timestamp = currentRotation
    lastBackupRotation = currentRotation
  } else {
    timestamp = 'hourly-' + new Date().getHours().toString().padStart(2, '0')
  }

  whisper('\x1b[36mInitializing backup for ' + timestamp + '\x1b[0m')
  let databasesNames = await listDatabases()
  await backupDatabases(databasesNames, timestamp)
  await compressBackups(databasesNames, timestamp)
  await encryptBackups(databasesNames, timestamp)
  if (process.env.UPLOAD_ENABLED === 'true') {
    await uploadBackups(databasesNames, timestamp)
  } else {
    whisper('Upload is disabled, so skipping it')
  }

  whisper(
    `\x1b[32mFinished with ${timestamp} backup rotation.\x1b[0m`,
    'Will try to make a backup in',
    process.env.BACKUP_INTERVAL_IN_HOURS,
    'hours'
  )

  setTimeout(async () => {
    await init()
  }, process.env.BACKUP_INTERVAL_IN_HOURS * ONE_HOUR_IN_MILLISECONDS)
}

async function listDatabases() {
  const client = new Client({
    host: process.env.DB_SERVER,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: 'postgres',
    connectionTimeoutMillis: 5000,
  })
  await client.connect()
  const sql = 'SELECT datname FROM pg_database WHERE datistemplate = false'
  const res = await client.query(sql)

  let databasesNames = res.rows
    .map((item) => item.datname)
    .filter((item) => !process.env.DB_NAMES_BLACKLIST.includes(item))
  await client.end()

  return databasesNames
}

async function backupDatabases(databasesNames, timestamp) {
  mkdirSyncIfNotExists(backupDirectoryPath)
  for (let databaseName of databasesNames) {
    backupDatabase(databaseName, timestamp)
  }
}

function backupDatabase(databaseName, timestamp) {
  whisper('Backing up database named', databaseName)
  let time = Date.now()
  let backupFilePath = getDatabaseBackupFilePath(databaseName, timestamp)
  const command = `pg_dump postgres://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_SERVER}:${process.env.DB_PORT}/${databaseName} -f ${backupFilePath} --no-owner`
  let result = execSync(command)
  whisper(
    `Backed up database named ${databaseName} to`,
    path.basename(backupFilePath),
    `in ${timeDiff(time)}`
  )
}

async function compressBackups(databasesNames, timestamp) {
  for (let databaseName of databasesNames) {
    await compressBackup(databaseName, timestamp)
  }
}

async function compressBackup(databaseName, timestamp) {
  return new Promise((resolve, reject) => {
    let backupFilePath = getDatabaseBackupFilePath(databaseName, timestamp)
    whisper('Compressing', path.basename(backupFilePath))
    let time = Date.now()

    let compressedBackupFilePath = getDatabaseCompressedBackupFilePath(
      databaseName,
      timestamp
    )

    var gzip = zlib.createGzip()
    var input = fs.createReadStream(backupFilePath)
    var output = fs.createWriteStream(compressedBackupFilePath)
    input
      .pipe(gzip)
      .pipe(output)
      .on('finish', function () {
        unlinkSync(backupFilePath)
        whisper(
          'Compressed to',
          path.basename(compressedBackupFilePath),
          `in ${timeDiff(time)}`
        )
        resolve()
      })
  })
}

async function encryptBackups(databasesNames, timestamp) {
  for (let databaseName of databasesNames) {
    let compressedBackupFilePath = getDatabaseCompressedBackupFilePath(
      databaseName,
      timestamp
    )
    whisper('Encrypting file', path.basename(compressedBackupFilePath))
    time = new Date()
    let encryptedBackupFilePath = getDatabaseEncryptedBackupFilePath(
      databaseName,
      timestamp
    )

    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(
      process.env.ENCRYPTION_ALGORITHM,
      process.env.ENCRYPTION_KEY,
      iv
    )
    let input = fs.createReadStream(compressedBackupFilePath)
    let output = fs.createWriteStream(encryptedBackupFilePath)

    const ivWriter = new Transform({
      hasWrittenIV: false,
      transform(chunk, encoding, callback) {
        if (!this.hasWrittenIV) {
          this.push(Buffer.concat([Buffer.from(iv), chunk]))
          this.hasWrittenIV = true
        } else {
          this.push(chunk)
        }
        callback()
      },
    })

    input.pipe(cipher).pipe(ivWriter).pipe(output)

    await new Promise((resolve, reject) => {
      output.on('finish', async function () {
        try {
          unlinkSync(compressedBackupFilePath)
          whisper(
            'Encrypted backup to',
            path.basename(encryptedBackupFilePath),
            `in ${timeDiff(time)}`
          )
          resolve()
        } catch (err) {
          reject(err)
        }
      })

      output.on('error', (err) => reject(err))
    })
  }
}

async function uploadBackups(databasesNames, timestamp) {
  for (let databaseName of databasesNames) {
    let encryptedBackupFilePath = getDatabaseEncryptedBackupFilePath(
      databaseName,
      timestamp
    )
    let fileName = path.basename(encryptedBackupFilePath)
    let time = Date.now()
    whisper(`Uploading ${fileName}`)

    let result
    try {
      result = await upload({
        file: encryptedBackupFilePath,
        bucket: process.env.UPLOAD_HANDLER_BUCKET,
        accessKey: process.env.UPLOAD_HANDLER_ACCESS_KEY,
        secretKey: process.env.UPLOAD_HANDLER_SECRET_KEY,
      })

      whisper(`Uploaded ${fileName} in ${timeDiff(time)}`)
    } catch (err) {
      whisper(`Error while uploading ${fileName}`, err.message, err.stack)
    }

    unlinkSync(encryptedBackupFilePath)
    whisper('Cleaned up the local files for ' + databaseName)
  }
}

function shout(err) {
  console.error(err.message, err.stack)
}

function whisper() {
  if (process.env.VERBOSE === 'true') {
    console.log(...arguments)
  }
}

function timeDiff(ref) {
  return (Date.now() - ref) / 1000 + 's'
}

function getDatabaseBackupFilePath(databaseName, timestamp) {
  let backupDirPath = getDatabaseBackupDirectory(databaseName)
  return path.join(backupDirPath, `${databaseName}-${timestamp}.bak`)
}

function getDatabaseBackupDirectory(databaseName) {
  let backupDirPath = path.join(backupDirectoryPath, databaseName)
  mkdirSyncIfNotExists(backupDirPath)
  return backupDirPath
}

function getDatabaseCompressedBackupFilePath(databaseName, timestamp) {
  return path.join(
    backupDirectoryPath,
    databaseName,
    `${databaseName}-${timestamp}.bak.gz`
  )
}

function getDatabaseEncryptedBackupFilePath(databaseName, timestamp) {
  return path.join(
    backupDirectoryPath,
    databaseName,
    `${databaseName}-${timestamp}.ebk`
  )
}

function mkdirSyncIfNotExists(dir) {
  try {
    mkdirSync(dir)
  } catch (e) {
    if (e.code != 'EEXIST') {
      throw e
    }
  }
}