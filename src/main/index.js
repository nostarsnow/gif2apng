import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path')
    .join(__dirname, '/static')
    .replace(/\\/g, '\\\\');
}

let mainWindow;
const winURL =
  process.env.NODE_ENV === 'development'
    ? `http://localhost:9080`
    : `file://${__dirname}/index.html`;

function createWindow() {
  /**
   * Initial window options
   */
  Menu.setApplicationMenu(null);
  mainWindow = new BrowserWindow({
    height: 600,
    useContentSize: true,
    width: 1000
  });

  mainWindow.loadURL(winURL);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on('get-files', (event, dir) => {
  const glob = require('glob');
  let files = glob.sync(dir);
  event.returnValue = files;
});
ipcMain.on('save-file', (event, param) => {
  const fs = require('fs')
  const options = {
    defaultPath: '~/' + param.name,
    nameFieldLabel: param.name,
    filters: [{ name: param.name, extensions: [param.ext] }]
  }
  dialog.showSaveDialog(options, filename => {
    if (filename) {
      fs.writeFile(filename, param.image, err => {
        if (err) {
          console.error(err);
        }
        event.returnValue = filename;
      });
    }
  });
});
ipcMain.on('generate-png', (event, form) => {
  const Spritesmith = require('spritesmith');
  const layout = require('layout');
  const tinify = require('tinify');
  const tinyApi = 'TBt9LL4YTg4RY5726sW0YzwBsWGklSNG';
  layout.addAlgorithm('left-right-wrap', {
    sort: function(items) {
      items.sort((a, b) => {
        let an = +a.meta.img._filepath.replace(/\D/g, '');
        let bn = +b.meta.img._filepath.replace(/\D/g, '');
        return an - bn;
      });
      return items;
    },
    placeItems: function(items) {
      items.forEach(function(item, i) {
        item.x = item.width * ~~(i % form.col);
        item.y = item.height * ~~(i / form.col);
      });
      form.width = items[0].width;
      form.height = items[0].height;
      return items;
    }
  });
  Spritesmith.run(
    {
      src: form.files,
      algorithm: 'left-right-wrap'
    },
    function(err, result) {
      let image = result.image;
      if (form.imgmin) {
        tinify.key = form.tinyApi || tinyApi;
        form.tinyApi = tinify.key;
        tinify.fromBuffer(image).toBuffer(function(err, resultData) {
          if (err) {
            generate(image);
          } else {
            generate(resultData, true, tinify.compressionCount);
          }
        });
      } else {
        generate(image);
      }
    }
  );
  function generate(image, imgmined = false, tinifyCount = 0) {
    form.imageName = 'g2p-img.png';
    form.imgmined = imgmined;
    if (form.renderType === 'img') {
      form.html = `
      <div class="g2p-img" id="g2p-img" data-src="./${form.imageName}"></div>
      <script>
        (function(document){
          var $box = document.querySelector('#g2p-img');
          var src = $box.getAttribute('data-src');
          var img = new Image();
          img.src = src;
          var width = ${form.width};
          var height = ${form.height};
          img.onload = function(){
            $box.style.backgroundImage = 'url(' + src + ')';
            $box.style.width = width + 'px';
            $box.style.height = height + 'px';
            g2pAnim(0,${form.col},${form.files.length},${form.frame});
          }
          function g2pAnim(index,col,max,step){
            setTimeout(function(){
              $box.style.backgroundPosition = (-width * ~~(index%col)) + 'px ' 
              + (-height * ~~(index/col)) + 'px';
              if ( ++index < max ){
                g2pAnim(index,col,max,step)
              }${
                form.loop
                  ? `else{
                g2pAnim(0,col,max,step)
              }`
                  : ''
              }
            }, 1000/step)
          }
        }(window.document));
      </script>
    `;
    } else if (form.renderType === 'canvas') {
      form.html = `
      <div class="g2p-img" id="g2p-img" data-src="./${form.imageName}"></div>
      <script>
        (function(document){
          var $box = document.querySelector('#g2p-img');
          var src = $box.getAttribute('data-src');
          var img = new Image();
          img.src = src;
          var width = ${form.width};
          var height = ${form.height};
          var canvas = document.createElement('canvas');
          var ctx = canvas.getContext('2d');
          img.onload = function(){
            $box.style.backgroundImage = 'url(' + src + ')';
            $box.style.width = width + 'px';
            $box.style.height = height + 'px';
            canvas.width = width;
            canvas.height = height;
            $box.appendChild(canvas);
            g2pAnim(0,${form.col},${form.files.length},${form.frame});
          }
          function g2pAnim(index,col,max,step){
            setTimeout(function(){
              ctx.clearRect(0, 0, width, height);
              ctx.drawImage(img,width * ~~(index%col),height * ~~(index/col),
              width, height, 0, 0, width, height);
              if ( ++index < max ){
                g2pAnim(index,col,max,step)
              }${
                form.loop
                  ? `else{
                g2pAnim(0,col,max,step)
              }`
                  : ''
              }
            }, 1000/step)
          }
        }(window.document));
      </script>
    `;
    }
    form.row =
      ~~(form.files.length / form.col) + +!!~~(form.files.length % form.col);
    form.tinifyCount = tinifyCount;
    event.sender.send('generate', {
      form,
      image: image
    });
  }
});
process.on('uncaughtException', function (exception) {
  // handle or ignore error
});
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
