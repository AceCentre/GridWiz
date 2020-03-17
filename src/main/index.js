import { app, BrowserWindow, Menu } from 'electron'

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 563,
    useContentSize: true,
    width: 1000,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false, // not needed
    },
  })
  
  const shell = require('electron').shell;
  var menu = Menu.buildFromTemplate([
    {
      label: 'Help and Support',
      submenu: [
        {
          label:'Send feedback',
          click() { 
              shell.openExternal('https://acecentre.org.uk/contact/')
          }
        },
        {
          label: 'View current open issues',
          click(){
              shell.openExternal('https://github.com/AceCentre/GridWiz/issues')
          }
        },
        {label:'Debug',
      click: () => {
      mainWindow.webContents.openDevTools();
      }
    },
        {
            label:'Donate to Ace Centre',
            click: () => {
              shell.openExternal('https://donate.justgiving.com/donation-amount?uri=aHR0cHM6Ly9kb25hdGUtYXBpLmp1c3RnaXZpbmcuY29tL2FwaS9kb25hdGlvbnMvOGRiMTExMzhmODRjNDk5MWIzMjgzZWJlMWJhM2FjYjc=')
            }
        }]
      },
      {    
              label: 'Quit',
              click: () => {
                  app.quit();
              }
          }
      ])
   Menu.setApplicationMenu(menu); 

  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })

    
    
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
