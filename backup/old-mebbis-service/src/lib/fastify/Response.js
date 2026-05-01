exports.sendSuccess = (reply, data, message = 'Success') => {
  reply
  .type('application/json').status(200)
    .send({
      status: 'success',
      message,
      data,
    });
  };   

  
  exports.sendError = (reply, message, statusCode = 400) => {
    reply.status(statusCode)  .type('application/json').send({
      status: 'error',
      message,
    });
  };