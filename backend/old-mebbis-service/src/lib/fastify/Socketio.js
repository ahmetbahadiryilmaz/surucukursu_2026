const { getTokenInfo } = require("@src/middleware/auth");

module.exports = async app => {

    app.decorate('fastify', app);

    app.ready().then(() => {

        app.io.on('connection', async (socket) => {
            const tokenString = socket.handshake.query.token || socket.handshake.headers['authorization'];
            console.info('new socket connection' , tokenString);
            const tokenArray = tokenString.split(' ');
            //console.info('tokenArray' , tokenArray.length);
            if (tokenArray.length < 2) {
                socket.emit('error', 'Token mistake disconnecting');
                socket.disconnect(true);
                return console.info('Token mistake disconnecting');
            }
            const token = tokenArray[1];
            const tokenInfo =  await getTokenInfo(app.knex, token)
            if (!tokenInfo) {
                socket.emit('error', 'Token mistake disconnecting2');
                socket.disconnect(true);
                return console.info('Token mistake disconnecting2');
            }
      
       
            socket.join("u" + tokenInfo.id.toString());
            for (const mebbisAccount of tokenInfo.mebbisAccounts) {
                socket.join("mebbis" + mebbisAccount.id.toString());
                
            }

            // Listen for an event
            socket.on('message', (msg) => {
                console.info(`Received message: ${msg}`);
                // Emit a response
                socket.emit('message', `Server received: ${msg}`);
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                console.info('user disconnected');
            });
        });

    });
}