const axios = require("axios");
const config = require("../config/daily_co");

const createDailyRoom = async (roomName) => {
    try {
        const roomConfig = {
            properties: {
                enable_chat: true,
                enable_screenshare: true,
                enable_recording: false, // Tắt recording theo yêu cầu
                start_video_off: false,
                start_audio_off: false,
                max_participants: 2,
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

module.exports = { createDailyRoom, deleteRoom, getRoomInfo };