#!/bin/bash

serverless invoke --function alexa-icemortgagestatus --stage $SLS_STAGE --path test/mock/specific-service.json

if [[ $? != 0 ]]; then
    echo "Failed specific-service test"
    exit 1
fi

serverless invoke --function alexa-icemortgagestatus --stage $SLS_STAGE --path test/mock/all-services.json

if [[ $? != 0 ]]; then
    echo "Failed all-services test"
    exit 1
fi
