const { exec } = require('child_process');

// Function to run the PHP command
function runCronJob() {
  const command = 'php index.php Cron cronSiraGetir';
  const workingDirectory = '/home/mtsk/mtsk.online';  // Set the working directory

  // Execute the command within the specified directory
  exec(command, { cwd: workingDirectory }, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      console.error(`stdout: ${stdout}`);

    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      console.error(`stdout: ${stdout}`);
    }
    if(!error && !stderr)     console.log(`stdout2: ${stdout}`);

  });
}

setInterval(runCronJob, 10000); // 10 seconds interval