const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PollSchema = new Schema({
  idPoll: {
    type: String,
    required: true,
    unique: true
  },
  idConversation: {
    type: String,
    required: true,
    ref: 'Conversation'
  },
  idCreator: {
    type: String,
    required: true,
    ref: 'User'
  },
  idMessage: {
    type: String,
    required: true,
    ref: 'MessageDetail'
  },
  question: {
    type: String,
    required: true
  },
  options: [{
    id: String,
    text: String,
    voters: [String], // Array of user IDs who voted for this option
    voteCount: {
      type: Number,
      default: 0
    }
  }],
  settings: {
    allowMultipleVotes: {
      type: Boolean,
      default: false
    },
    allowAddOptions: {
      type: Boolean,
      default: false
    },
    hideVoters: {
      type: Boolean,
      default: false
    },
    endDate: {
      type: Date,
      default: null // null means no end date
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Cập nhật thời gian khi có thay đổi
PollSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Tạo index để tìm kiếm nhanh hơn
PollSchema.index({ idPoll: 1 });
PollSchema.index({ idConversation: 1 });
PollSchema.index({ idMessage: 1 });

module.exports = mongoose.model('Poll', PollSchema);