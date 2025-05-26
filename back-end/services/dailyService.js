const axios = require("axios");
const config = require("../config/daily_co");

const createDailyRoom = async (roomName, callType) => {
    try {
        const roomConfig = {
            properties: {
                enable_chat: false,
                enable_screenshare: false,
                enable_recording: false,
                start_video_off: callType === "audio" ? true : false,
                start_audio_off: false,
                enable_prejoin_ui: false,
            },
        };

        if (roomName) {
            roomConfig.name = roomName;
        }

        const response = await axios.post(
            config.dailyApiUrl,
            roomConfig,
            {
                headers: {
                    Authorization: `Bearer ${config.dailyApiKey}`,
                    "Content-Type": "application/json",
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error("Error creating Daily.co room:", error.message);
        throw error;
    }
};

const deleteRoom = async (roomName) => {
    try {
        const response = await axios.delete(
            `${config.dailyApiUrl}/${roomName}`,
            {
                headers: {
                    Authorization: `Bearer ${config.dailyApiKey}`,
                },
            }
        );
        return response.data;
    } catch (error) {
        // Nếu room không tồn tại (404), coi như đã xóa thành công
        if (error.response && error.response.status === 404) {
            console.log(`Room ${roomName} already deleted or not found`);
            return { message: 'Room already deleted' };
        }
        console.error("Error deleting Daily.co room:", error.message);
        throw error;
    }
};

const getRoomInfo = async (roomName) => {
    try {
        const response = await axios.get(
            `${config.dailyApiUrl}/${roomName}`,
            {
                headers: {
                    Authorization: `Bearer ${config.dailyApiKey}`,
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error("Error getting room info:", error.message);
        throw error;
    }
};

// Thêm function mới để lấy thông tin participants trong room
const getRoomParticipants = async (roomName) => {
    try {
        const response = await axios.get(
            `${config.dailyApiUrl}/${roomName}/presence`,
            {
                headers: {
                    Authorization: `Bearer ${config.dailyApiKey}`,
                },
            }
        );
        console.log("response get room participants: ",response.data);
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.log(`Room ${roomName} not found, assuming no participants`);
            return { data: [] }; // Trả về mảng rỗng nếu phòng không tồn tại
        }
        console.error("Error getting room participants:", error.message);
        throw error;
    }
};
module.exports = { createDailyRoom, deleteRoom, getRoomInfo, getRoomParticipants };