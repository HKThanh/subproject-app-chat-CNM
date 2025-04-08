const dynamoose = require("../config/connectDynamodb");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment-timezone");
const MessageDetailModel = require("../models/MessageDetailModel");
