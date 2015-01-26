## Synopsis

This Web-Based tool helps administrating couchbase clusters. You can add/update/delete properties on documents matching a query, or run a custom JavaScript expression against those documents.

## Code Example

See the help page inside the web-based tool.

## Prerequisites

With your couchbase cluster, you need to install N1QL, a SQL-like engine to parse and return documents matching a SQL query.
This web-based tool runs on nodejs and serves a web application to manage the configured clusters in the config.json file.
Edit the config.json file with your own data, and see the Help page for further help.

## Installation

1. Install node
2. Install Python 2.7 (node module bcrypt is depended on python 2.7, consider changing to crypto for no dependecies)
3. Git clone https://github.com/Branor/couchbase-admin-console.git
4. Npm install –g nodemon bower (nodemon, run node process as deamon && bower client-side dependency resolver)
5. Cd to app directory
6. ‘npm install’ (install dependencies), it will create new directory node_modules in root of project.
7. ‘bower install’ (install dependencies), it will create new directory libs in public directory of project (make sure git is in your path env variables).
8. Run process with ‘nodemon server.js’ and at production this command will be ‘node server.js’ and we should make a demon out of it (node env variables, set to production when needed – for configuration – “export NODE_ENV=production).
 
## Contributors

Eyal Ben-Ivri <eyalb@sela.com>
David Ostrovski <davido@couchbase.com>
