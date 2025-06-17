#!/bin/bash

# Create ECDSA key pair for JWT signing
openssl ecparam -name prime256v1 -genkey -noout -out server/config/jwt.key
openssl ec -in server/config/jwt.key -pubout -out server/config/jwt.pub

# Set proper permissions
chmod 600 server/config/jwt.key
chmod 644 server/config/jwt.pub 