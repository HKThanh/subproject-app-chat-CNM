const dynamoose = require("dynamoose");
require("dotenv").config();

const connectDB = () => {
    const ddb = new dynamoose.aws.ddb.DynamoDB({
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
        region: process.env.AWS_REGION,
    });
    dynamoose.aws.ddb.set(ddb);
}


module.exports = connectDB;