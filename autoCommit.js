const { exec } = require('child_process');

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
}

async function autoCommit() {
  try {
    await runCommand('git add .');
    console.log('Staged all changes.');

    await runCommand('git commit -m "auto commit"');
    console.log('Committed changes.');

    await runCommand('git push origin main');
    console.log('Pushed to remote repository.');
  } catch (err) {
    // If no changes to commit or other errors
    console.error('Error:', err.trim());
  }
}

autoCommit();
