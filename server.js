const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const QRCode = require('qrcode');

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/mobile', (req, res) => {
    res.sendFile(path.join(__dirname, 'mobile.html'));
});

io.on('connection', (socket) => {
    
    socket.on('register-pc', async () => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase(); 
        socket.join(roomId);
        socket.roomId = roomId;
        console.log(`PC registered in session room: ${roomId}`);

        const referer = socket.handshake.headers.referer;
        let baseUrl = `http://localhost:${PORT}`;

        if (referer) {
            try {
                const urlObj = new URL(referer);
                baseUrl = urlObj.origin; 
            } catch (e) {
                console.error("Referer parsing error, relying on default fallback link configuration.");
            }
        }

        const mobileUrl = `${baseUrl}/mobile?room=${roomId}`;
        console.log(`Generating QR code link destination: ${mobileUrl}`);

        try {
            const qrDataUrl = await QRCode.toDataURL(mobileUrl);
            socket.emit('init-pc', { roomId, qrCode: qrDataUrl });
            console.log(`QR code successfully dispatched to room instance ${roomId}.`);
        } catch (err) {
            console.error('QR code generation unexpected failure:', err);
        }
    });

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        socket.roomId = roomId; 
        console.log(`Mobile controller unit connected to room session: ${roomId}`);
    });

    socket.on('sensor-data', (data) => {
        if (socket.roomId) {
            socket.to(socket.roomId).emit('update-monitor', data);
        }
    });

    socket.on('pc-step-1', () => {
        if (socket.roomId) {
            socket.to(socket.roomId).emit('handy-set-step-1');
        }
    });

    socket.on('pc-step-2', () => {
        if (socket.roomId) {
            socket.to(socket.roomId).emit('handy-set-step-2');
        }
    });

    socket.on('disconnect', () => {
        console.log('A telemetry node has disconnected from the active socket architecture.');
    });
});

http.listen(PORT, () => {
    console.log(`Application server running and listening on port environment target: ${PORT}`);
});