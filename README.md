# Rinty

Rinty is a PostgreSQL database server backup tool with built-in file rotation written in JavaScript and NodeJS. 

It also compresses and encrypts the backup files (AES) and uploads them to cloud services supporting AWS S3-compatible storage.

## Getting Started

You can run Rinty supplying the right Environment Variables to the start script of the app. It can be run as a docker container or systemd service. Here we will cover running it in a docker container. 

First make a copy of `.env.example` file and name it `.env`. Then edit files according to the table below:

| Variable Name      | Description         |
| -------   | ------------------- |
| VERBOSE | Outputs the process of backup, compresion, encryption and uploading of the files. Useful for debugging. set it to `false` in production | 
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


Then in the project directory run:

````bash
$ docker build -t rinty .
````

To run the created image use this command:

````bash
$ docker run --env-file ./.env -d rinty
````

Then you can get the container ID and use it to view the Rinty logs:
````bash
# Get container ID
$ docker ps

# Print app output
$ docker logs <container id>
````

And that's it.

## How backup rotation works?

If you're backing up big things, every day, storage quickly gets expensive. One way to combat that is to expire old archives, perhaps via some algorithm. A second way to combat that is to generate backup filenames that overwrite previous archives. Sounds scary? Maybe. Yes. But so does automatically purging old archives. Rinty uses the latter approach by using [rotation](https://www.npmjs.com/package/rotation) package to  to generate backup filenames. You can read more about this approach in *rotation* [readme file](https://www.npmjs.com/package/rotation).

## Feedback & Pull Requests

You are welcome to use GitHub issues of the project to report problems or sending feedback. 

Any pull requests to improve the code or add new upload handlers is appreciated.


## License

MIT, see [LICENSE.md](https://github.com/arashmilani/rinty/blob/master/LICENSE.md) for details.