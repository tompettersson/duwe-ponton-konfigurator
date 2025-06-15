
// Get latest console logs
const logs = [];
const originalLog = console.log;
console.log = function(...args) {
  logs.push(args.join(' '));
  originalLog.apply(console, arguments);
};

// Get the last 10 debug logs that contain our debug markers
window.getLatestDebugLogs = () => {
  return logs.filter(log => 
    log.includes('🔍 HOVER DEBUG') || 
    log.includes('🖱️ CLICK DEBUG') || 
    log.includes('🔨 ADD PONTOON DEBUG') ||
    log.includes('🧊 PONTOON RENDER DEBUG') ||
    log.includes('🧊 GRID-TO-WORLD DEBUG') ||
    log.includes('🎯 FINAL RENDER POSITION')
  ).slice(-10);
};

