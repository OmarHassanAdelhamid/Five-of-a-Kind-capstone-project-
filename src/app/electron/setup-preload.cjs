const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('setupApi', {
  onUpdate: (fn) => {
    const listener = (_e, data) => fn(data)
    ipcRenderer.on('setup-update', listener)
    return () => ipcRenderer.removeListener('setup-update', listener)
  },
  continuePython: (pathOrEmpty) =>
    ipcRenderer.send('setup-continue-python', pathOrEmpty),
  cancelSetup: () => ipcRenderer.send('setup-continue-python', 'CANCEL'),
  browsePython: () => ipcRenderer.invoke('setup-browse-python'),
})
