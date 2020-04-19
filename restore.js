require('./config').init()

const fs = require('fs')
const crypto = require('crypto')
const zlib = require('zlib')

decryptBackup(process.argv[process.argv.length - 1]).catch((err) => {
  shout(err)
  process.exit(1)
})

async function decryptBackup(encryptedBackupFilePath) {
  if (!fs.existsSync(encryptedBackupFilePath)) {
    throw new Error('File not found: ' + encryptedBackupFilePath + '\n')
  }

  whisper('Decrypting ', encryptedBackupFilePath)
  let compressedBackupFilePath = encryptedBackupFilePath.replace(
    '.ebk',
    '.bak.gz'
  )
  let backupFilePath = compressedBackupFilePath.replace('.bak.gz', '.bak')

  let input = fs.createReadStream(encryptedBackupFilePath, {
    start: 16,
  })
  let output = fs.createWriteStream(backupFilePath)

  let fh = await fs.promises.open(encryptedBackupFilePath, 'r')
  let iv = Buffer.alloc(16)
  await fh.read(iv, 0, 16, 0)
  await fh.close()

  decipher = crypto.createDecipheriv(
    process.env.ENCRYPTION_ALGORITHM,
    process.env.ENCRYPTION_KEY,
    iv
  )

  let guzip = zlib.createGunzip()
  input.pipe(decipher).pipe(guzip).pipe(output)

  await new Promise((resolve, reject) => {
    output.on('finish', function () {
      whisper('Decrypted file to', backupFilePath)
      resolve()
    })
    output.on('error', reject)
  })
}

function shout(err) {
  console.error(err.message, err.stack)
}

function whisper() {
  if (process.env.VERBOSE === 'true') {
    console.log(...arguments)
  }
}
