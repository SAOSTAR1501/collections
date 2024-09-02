const { QRBank, BankData } = require('qrbank');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

module.exports.config = {
    name: "qrbank",
    version: "1.0.0",
    hasPermission: 0,
    credits: "Lofi Team (Satoru)",
    description: "Tạo mã QR để chuyển khoản ngân hàng",
    commandCategory: "banking",
    usages: "[bankCode] [bankNumber] [accountName] [amount] [purpose]",
    cooldowns: 5
};

module.exports.handleEvent = async function ({ api, event }) {
    const { threadID, messageID, body } = event;

    if (body.toLowerCase() === "bankinfo") {
        const bankCodes = Object.keys(BankData);
        const bankList = bankCodes.join(", ");
        api.sendMessage(`Danh sách mã ngân hàng:\n${bankList}`, threadID, messageID);
    }
};

module.exports.handleReply = async function ({ api, event, handleReply }) {
    const { threadID, messageID, body } = event;
    const step = handleReply.step;
    const data = handleReply.data;

    switch (step) {
        case 1:
            data.bankCode = body.trim();
            api.sendMessage("Vui lòng nhập số tài khoản:", threadID, (err, info) => {
                global.client.handleReply.push({
                    step: 2,
                    name: this.config.name,
                    messageID: info.messageID,
                    author: event.senderID,
                    data: data
                });
            });
            break;
        case 2:
            data.bankNumber = body.trim();
            api.sendMessage("Vui lòng nhập tên tài khoản:", threadID, (err, info) => {
                global.client.handleReply.push({
                    step: 3,
                    name: this.config.name,
                    messageID: info.messageID,
                    author: event.senderID,
                    data: data
                });
            });
            break;
        case 3:
            data.accountName = body.trim();
            api.sendMessage("Vui lòng nhập số tiền:", threadID, (err, info) => {
                global.client.handleReply.push({
                    step: 4,
                    name: this.config.name,
                    messageID: info.messageID,
                    author: event.senderID,
                    data: data
                });
            });
            break;
        case 4:
            data.amount = body.trim();
            api.sendMessage("Vui lòng nhập nội dung chuyển khoản:", threadID, (err, info) => {
                global.client.handleReply.push({
                    step: 5,
                    name: this.config.name,
                    messageID: info.messageID,
                    author: event.senderID,
                    data: data
                });
            });
            break;
        case 5:
            data.purpose = body.trim();
            const bankData = BankData[data.bankCode.toLowerCase()];
            if (!bankData) {
                return api.sendMessage(`Mã ngân hàng "${data.bankCode}" không hợp lệ!`, threadID, messageID);
            }

            try {
                const qrbank = QRBank.initQRBank({
                    bankBin: bankData.bin,
                    bankNumber: data.bankNumber,
                    accountName: data.accountName,
                    amount: data.amount,
                    purpose: data.purpose
                });

                const qrCode = await qrbank.generateQRCode();

                const canvas = createCanvas(300, 300);
                const ctx = canvas.getContext('2d');

                const img = await loadImage(qrCode);
                ctx.drawImage(img, 0, 0, 300, 300);

                const buffer = canvas.toBuffer('image/png');
                const filename = `qrbank_${Date.now()}.png`;
                const filepath = path.join(__dirname, filename);
                fs.writeFileSync(filepath, buffer);

                api.sendMessage({
                    body: `Mã QR chuyển khoản ngân hàng ${bankData.name}:\nSố tài khoản: ${data.bankNumber}\nTên tài khoản: ${data.accountName}\nSố tiền: ${data.amount} VND\nNội dung: ${data.purpose}`,
                    attachment: fs.createReadStream(filepath)
                }, threadID, () => fs.unlinkSync(filepath), messageID);
            } catch (error) {
                console.error(error);
                api.sendMessage('Đã xảy ra lỗi khi tạo mã QR ngân hàng!', threadID, messageID);
            }
            break;
    }
};

module.exports.run = async function ({ api, event }) {
    api.sendMessage("Vui lòng nhập mã ngân hàng:", event.threadID, (err, info) => {
        global.client.handleReply.push({
            step: 1,
            name: this.config.name,
            messageID: info.messageID,
            author: event.senderID,
            data: {}
        });
    });
};
