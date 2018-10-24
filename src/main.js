const {app, BrowserWindow, Menu, MenuItem} = require('electron')

const path = require('path')
const url = require('url')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let openWindows = 0;

function createWindow () {
    // Create the browser window.
    let win = new BrowserWindow({
        width: 800,
        height: 600,
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#252525',
        title: "Notulous",
        show: false
    })

    win.once('ready-to-show', () => {
        win.maximize()
        win.show()
    })

    // and load the index.html of the src.
    win.loadURL(url.format({
        pathname: path.join(__dirname, '../assets/main.html'),
        protocol: 'file:',
        slashes: true
    }))

    // Open the DevTools.
    win.webContents.openDevTools()

    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your src supports multi windows, this is the time
        // when you should delete the corresponding element.
        win.destroy();
        win = null
        openWindows--;
    })
    createMenu();
    openWindows++;
};

function createMenu() {
    // const menu = new Menu()
    // menu.append(new MenuItem({
    //     label: 'Print',
    //     accelerator: 'CmdOrCtrl+P',
    //     click: () => { console.log('time to print stuff') }
    // }))
    const template = [
        {
            label: 'Edit',
            submenu: [
                {
                    label: "Undo",
                    accelerator: "CmdOrCtrl+Z",
                    selector: "undo:"
                },
                {
                    label: "Redo",
                    accelerator: "Shift+CmdOrCtrl+Z",
                    selector: "redo:"
                },
                { type: "separator" },
                {
                    label: "Cut",
                    accelerator: "CmdOrCtrl+X",
                    selector: "cut:"
                },
                {
                    label: "Copy",
                    accelerator: "CmdOrCtrl+C",
                    selector: "copy:"
                },
                {
                    label: "Paste",
                    accelerator: "CmdOrCtrl+V",
                    selector: "paste:"
                },
                {
                    label: "Select All",
                    accelerator: "CmdOrCtrl+A",
                    selector: "selectAll:"
                }
            ]
        },
        {
        label: 'Instance',
        submenu: [
            {
                label: 'Add instance',
                accelerator: 'CmdOrCtrl+N',
                click (menuItem, currentWindow) {
                    currentWindow.webContents.send('add-instance');
                }
            }
        ]
    },
    {
        label: 'Database',
        submenu: [
            {
                label: 'Add',
                accelerator: 'CmdOrCtrl+Alt+A',
                click (menuItem, currentWindow) {
                    currentWindow.webContents.send('add-database');
                }
            },
            {
                label: 'Remove',
                accelerator: 'CmdOrCtrl+Alt+R',
                click (menuItem, currentWindow) {
                    currentWindow.webContents.send('remove-database');
                }
            }
        ]
    },
    {
        label: 'Table',
        submenu: [
            {
                label: 'Filter',
                accelerator: 'CmdOrCtrl+F',
                click (menuItem, currentWindow) {
                    currentWindow.webContents.send('table-filter');
                }
            },
            {
                label: 'Reload',
                accelerator: 'CmdOrCtrl+R',
                click (menuItem, currentWindow) {
                    currentWindow.webContents.send('table-reload');
                }
            }
        ]
    },
    {
      label: 'View',
        submenu: [
            // {role: 'reload'},
            {role: 'forcereload'},
            {role: 'toggledevtools'},
            // {type: 'separator'},
            // {role: 'resetzoom'},
            // {role: 'zoomin'},
            // {role: 'zoomout'},
            {type: 'separator'},
            {
                label: 'Editor',
                accelerator: 'CmdOrCtrl+E',
                click (menuItem, currentWindow) {
                    currentWindow.webContents.send('editor');
                }
            },
            {
                label: 'Table',
                accelerator: 'CmdOrCtrl+T',
                click (menuItem, currentWindow) {
                    currentWindow.webContents.send('table');
                }
            },
            {
                label: 'Archive',
                accelerator: 'CmdOrCtrl+K',
                click (menuItem, currentWindow) {
                    currentWindow.webContents.send('archive');
                }
            },
            {type: 'separator'},
            {role: 'togglefullscreen'}
        ]
    },
    {
        label: 'Search',
        submenu: [
            {
                label: 'All',
                accelerator: 'CmdOrCtrl+P',
                click (menuItem, currentWindow) {
                    currentWindow.webContents.send('search-all');
                }
            }
        ]
    },
    {
      role: 'window',
        submenu: [
            {
                label: 'New Window',
                accelerator: 'CmdOrCtrl+Alt+N',
                click (menuItem, currentWindow) {
                    createWindow();
                }
            },
            {type: "separator"},
            {role: 'minimize'},
            {role: 'close'}
        ]
    },
    {
      role: 'help',
        submenu: [
        {
            label: 'Learn More',
            click() {
                require('electron').shell.openExternal('https://electronjs.org');
            }
        }]
    }];

    if (process.platform === 'darwin') {
        template.unshift({
            label: "Notulous",
            submenu: [
                {role: 'about'},
                {type: 'separator'},
                // {role: 'services', submenu: []},
                // {type: 'separator'},
                {role: 'hide'},
                {role: 'hideothers'},
                {role: 'unhide'},
                {type: 'separator'},
                {role: 'quit'}
            ]
        }
    )

    // // Edit menu
    // template[1].submenu.push(
    //   {type: 'separator'},
    //   {
    //     label: 'Speech',
    //     submenu: [
    //       {role: 'startspeaking'},
    //       {role: 'stopspeaking'}
    //     ]
    //   }
    // )

    // Window menu
    // template[3].submenu = [
    //   {role: 'close'},
    //   {role: 'minimize'},
    //   {role: 'zoom'},
    //   {type: 'separator'},
    //   {role: 'front'}
    // ]
    }

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the src when the
    // dock icon is clicked and there are no other windows open.
    if (openWindows <= 0) {
        createWindow()
    }
})

// In this file you can include the rest of your src's specific main process
// code. You can also put them in separate files and require them here.
