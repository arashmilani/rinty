# Rinty

Rinty is a PostgreSQL database server backup tool with built-in file rotation written in JavaScript and NodeJS. 

It also compresses and encrypts the backup files (AES) and uploads them to cloud services supporting AWS S3-compatible storage.

## Getting Started

You can run Rinty supplying the right Environment Variables to the start script of the app. I recommend using a daemon process manager like [PM2](https://github.com/Unitech/pm2). 

NOTE: Rinty is using `pg_dump` and it will throw a version mismatch if the `pg_dump` version and database server versions are different. So you either need to run Rinty in the same server with your database or if you are using different servers for your database and Rinty, the `pg_dump` and PostgreSQL versions on both servers should match.

### Using PM2

First clone the repository and make a copy of `.env.example` file and name it `.env`. Then edit the new file according to the table below to configure the app:

| Variable Name      | Description         |
| -------   | ------------------- |
| VERBOSE | Outputs the process of backup, compression, encryption and uploading of the files. Useful for debugging. set it to `false` in production | 
| DB_TYPE      | currently only supported database is `PostgreSQL` |
| DB_SERVER      | IP address or hostname of the database server |
| DB_PORT      | Port number of the database server. For PostgreSQL the default port is `5432` |
| DB_USERNAME      | Database username |
| DB_PASSWORD      | Database password |
| BACKUP_INTERVAL_IN_HOURS      | Daily backup interval in hours. default value is `6` |
| DB_NAMES_BLACKLIST      | Rinty will try to backup all the databases accessible to the specified db username. This option is a comma separated db names to ignore while taking backups. |
| ENCRYPTION_ALGORITHM      | Algorithm used by Node.js Crypto API. Recommended value is `aes-256-cbc` |
| ENCRYPTION_KEY      | Encryption key according to the algorithm type. for aes-256-cbc algorithm you should use a random 32 character string (256 bit) |
| UPLOAD_ENABLED      | Should upload the backups. Set to `true` in production |
| UPLOAD_HANDLER_PROVIDER      | Currently supporting two options `aws` and `abrarvan` |
| UPLOAD_HANDLER_BUCKET      | AWS S3-compatible storage bucket name |
| UPLOAD_HANDLER_ACCESS_KEY      | Access key to your selected upload handler |
| UPLOAD_HANDLER_SECRET_KEY      | Secret key to your selected upload handler |

To start Rinty using PM2 just run

````bash
$ pm2 start index.js --name rinty --env production 
````

Reminder: Restarting PM2 with the processes you manage on server boot/reboot is critical. Read more about [PM2 startup script generator](https://pm2.keymetrics.io/docs/usage/startup/).

After running Rinty using PM2, you can view its logs by:
````bash
$ pm2 logs
````

And that's it. Rinty will start backing up the databases right away.

## How backup rotation works?

If you're backing up big things, every day, storage quickly gets expensive. One way to combat that is to expire old archives, perhaps via some algorithm. A second way to combat that is to generate backup filenames that overwrite previous archives. Sounds scary? Maybe. Yes. But so does automatically purging old archives. Rinty uses the latter approach by using [rotation](https://www.npmjs.com/package/rotation) package to  to generate backup filenames. You can read more about this approach in *rotation* [readme file](https://www.npmjs.com/package/rotation).

## Feedback & Pull Requests

You are welcome to use GitHub issues of the project to report problems or sending feedback. 

Any pull requests to improve the code or add new database server types or upload handlers is appreciated.


## License

MIT, see [LICENSE.md](https://github.com/arashmilani/rinty/blob/master/LICENSE.md) for details.
