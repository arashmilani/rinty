require('dotenv').config()

module.exports.init = function () {
  process.env.VERBOSE = process.env.VERBOSE === 'true'

  process.env.BACKUP_INTERVAL_IN_HOURS =
    parseInt(process.env.BACKUP_INTERVAL_IN_HOURS) || 6

  if (process.env.BACKUP_INTERVAL_IN_HOURS > 24) {
    throw new Error('Backup interval can not be greater than 24 hours')
  }

  if (process.env.BACKUP_INTERVAL_IN_HOURS < 1) {
    throw new Error('Backup interval can not be less than 1 hours')
  }

  process.env.DB_SERVER = process.env.DB_SERVER || 'localhost'
  process.env.DB_PORT = process.env.DB_PORT || 5432
  process.env.DB_USERNAME = process.env.DB_USERNAME || process.env.USER
  process.env.DB_PASSWORD = process.env.DB_PASSWORD || null

  process.env.DB_NAMES_BLACKLIST = process.env.DB_NAMES_BLACKLIST || ''
  process.env.DB_NAMES_BLACKLIST = process.env.DB_NAMES_BLACKLIST.split(',')

  process.env.UPLOAD_ENABLED = process.env.UPLOAD_ENABLED === 'true'
  process.env.UPLOAD_HANDLER_PROVIDER =
    process.env.UPLOAD_HANDLER_PROVIDER || 'aws'
}
