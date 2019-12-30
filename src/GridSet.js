import * as sax from 'sax'
import * as JSZip from 'jszip'
import * as fs from 'fs'
import * as path from 'path'
import * as uuidv4 from 'uuid/v4'
import * as crypto from 'crypto'

export default class GridSet {
  constructor () {
    this._modify_files = []
  }
  async importFromFile (fn) {
    let data = await (new Promise((resolve, reject) => {
      fs.readFile(fn, (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    }))
    return await this.importFromBuffer(data, path.basename(fn))
  }
  async importFromBuffer (data, filename) {
    let fnprefix = filename + '/'
    let zip = await JSZip.loadAsync(data)
    let files = []
    zip.forEach((relativePath, file) => files.push(file))

    this._zip = zip
    this._files = files

    let filemaplist = files.filter((a) => (
      a.name == 'FileMap.xml' ||
        (a.name.startsWith(fnprefix) &&
         a.name.substr(fnprefix.length) == 'FileMap.xml')
    ))

    if (filemaplist.length == 0) {
      throw new Error('FileMap.xml not found!')
    }

    let filemapxml = (await filemaplist[0].async('nodebuffer')).toString('utf-8')
    this.filemap = filemaplist[0]
    this.entries = await (new Promise((resolve, reject) => {
      let parser = sax.createStream(false)
      let entries = []
      let ientry = null
      let idynfiles = null
      let ifilestr = null
      parser.on('error', (err) => {
        reject(err)
      })
      parser.on('end', () => {
        resolve(entries)
      })
      parser.on('text', (text) => {
        if (typeof ifilestr == 'string') {
          ifilestr += text
        }
      })
      parser.on('opentag', (node) => {
        if (node.name == 'ENTRY') {
          ientry = {
            static_file: node.attributes.STATICFILE.trim(),
            dynamic_files: [],
          }
          if (node.isSelfClosing) {
            entries.push(ientry)
            ientry = null
          }
        } else if (node.name == 'DYNAMICFILES') {
          idynfiles = []
        } else if (node.name == 'FILE') {
          ifilestr = ''
        }
      })
      parser.on('closetag', (name) => {
        if (name == 'ENTRY' && !!ientry) {
          entries.push(ientry)
          ientry = null
        } else if (name == 'DYNAMICFILES' && !!idynfiles) {
          if (!!ientry) {
            ientry.dynamic_files = idynfiles.map((a) => a.trim())
          }
          idynfiles = null
        } else if (name = 'FILE' && typeof ifilestr == 'string') {
          if (!!ifilestr && !!idynfiles) {
            idynfiles.push(ifilestr)
          }
          ifilestr = null
        }
      })
      parser.write(filemapxml)
      parser.end()
    }))
  }
  async saveToFile (fn) {
    let data = await this.saveToBuffer()
    await (new Promise((resolve, reject) => {
      fs.writeFile(fn, data, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    }))
  }
  async saveToBuffer (options={ compression: 'DEFLATE' }) {
    let newzip = new JSZip()
    await (Promise.all(
      this._files.map(async (file) => {
        let modobj = this._modify_files.find((a) => a.name == file.name)
        let data = modobj ? modobj.data : await file.async('nodebuffer')
        newzip.file(file.name, data)
      })
    ))
   return await newzip.generateAsync(Object.assign(options, { type: 'nodebuffer' }))
  }
  async modifyFileByChecksum (newdata, checksum, checksum_cache) {
    await (Promise.all(
      this._files.slice().map(async (file) => {
        let ismatch = false
        if (checksum_cache && checksum_cache[file.name]) {
          ismatch = checksum_cache[file.name] == checksum
        } else {
          let data = await file.async('nodebuffer')
          let filechecksum = this._dataChecksum(data)
          if (checksum_cache) {
            checksum_cache[file.name] = filechecksum
          }
          ismatch = filechecksum == checksum
        }
        if (ismatch) {
          this.modifyFile(file.name, newdata)
        }
      })
    ))
  }
  async getFileChecksum (fn) {
    let filelist = this._files.filter((a) => a.name == fn)
    if (filelist.length === 0) {
      throw new Error('File not found: ' + fn)
    }
    let data = await filelist[0].async('nodebuffer')
    return this._dataChecksum(data)
  }
  _dataChecksum (data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  clearModifyMemory () {
    this._modify_files = []
  }
  modifyFile (name, newdata) {
    let modobj = {
      name: name,
      data: newdata,
    }
    let idx = this._modify_files.findIndex((a) => a.name == name)
    if (idx != -1) {
      this._modify_files[idx] = modobj
    } else {
      this._modify_files.push(modobj)
    }
  }
}
