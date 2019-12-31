<template>
  <div class="fill-height main-page">
    <div v-bind:class="{'fill-height v-box step-one':1,hidden:currentStep!=1}">
      <div class="h-box flex-center-items padded-box main-header">
        <div class="padded-box">
          <button type="button" class="pure-button button-primary inpfilebtn" title="Import">
            <span>Import</span>
            <input type="file" v-on:change="didChangeImportFile($event)"/>
          </button>
        </div>
      </div>
      <div class="flex-autoscroll">
        <div class="v-box justify-content-center">
          <div v-for="entry of entries" v-bind:key="entry.static_file" class="v-box">
            <a class="text-center padded-box" href v-on:click="didClickEntry(entry, $event)">
              {{entry.static_file}}
            </a>
          </div>
        </div>
      </div>
    </div>
    <div v-if="!!targetEntry" v-bind:class="{'fill-height v-box step-two':1,hidden:currentStep!=2}">
      <div class="v-box main-header">
        <div class="h-box flex-center-items padded-box">
          <div v-if="showBack" class="padded-box">
            <button type="button" class="pure-button" v-on:click="didClickStepBack" title="Back">Back</button>
          </div>
          <div class="h-box flex-center-items padded-box pure-form">
            <input placeholder="Search Query" type="text" class="pure-input-rounded" v-model="searchQuery">
            <label for="search-safe-checkbox" class="pure-checkbox padded-box">
              <input id="search-safe-checkbox" type="checkbox" v-model="searchSafe"> Safe
            </label>
            <button type="button" class="pure-button button-primary" v-on:click="didClickSearch" title="Search">Search</button>
          </div>
        </div>
        <div class="h-box flex-center-items padded-box">
          <p>Select {{targetEntry.dynamic_files.length}} images and set Its order, Then hit export to generate a gridset.</p>
          <div class="flex-grow"></div>
          <!--
          <div class="paded-box">
            {{targetEntry.dynamic_files.length - selectedImages.length}} remained
          </div>
          -->
          <div class="padded-box">
            <button type="button" v-bind:class="{'pure-button button-primary':1,'l-disabled':selectedImages.length != targetEntry.dynamic_files.length}" v-on:click="didClickExport" title="Export">Export</button>
          </div>
        </div>
      </div>
      <div class="flex-autoscroll" v-on:scroll="didScroll($event)">
        <div class="h-box justify-content-center flex-wrap">
          <div v-for="image of images" v-bind:key="image.url" v-bind:class="{'select-image v-box':1,'selected':selectedImages.indexOf(image) != -1}">
            <div class="panel" v-on:click="didClickImagePanel(image)">
              <img class="img-full-width" v-bind:src="image.url">
              <div v-bind:class="{'padded-box':1,hidden:selectedImages.indexOf(image) == -1}" v-on:click="$event.stopPropagation()">
                <input placeholder="Choose a number" type="number" class="pure-input-rounded" v-on:input="didChangeImageNumber(image, $event)" v-bind:value="image.imageNumber||'0'">
              </div>
            </div>
          </div>
        </div>
        <div ref="listEndIndicator" class="list-end-indicator"></div>
      </div>
    </div>
  </div>
</template>

<script>
  import * as gis from 'g-i-s';
  import GridSet from '../../GridSet'
  import { remote } from 'electron'
  import * as path from 'path'
  import * as fs from 'fs'

// code for this function is from pasco/js/core.js
function fs_friendly_name (s) {
  return s.replace(/^[a-z]{1,10}\:\/\//i,"").replace(/\?.*$/,"")
    .replace(/[ \(\)\[\]\*\#\@\!\$\%\^\&\+\=\/\\:]/g, '_')
    .replace(/[\r\n\t]/g, '');
}

  export default {
    name: 'main-page',
    props: [],
    data: () => ({
      searchQuery: '',
      searchSafe: true,
      listEndIndicator: null,
      images: [],
      selectedImages: [],
      entries: [],
      targetEntry: null,
      currentStep: 0,
      _noMore: false,
      _loading: false,
      showBack: false,
    }),
    mounted () {
      (async () => {
        // load default gridwiz
        this._gridset = new GridSet()
        let fn = path.join(__static, 'GridWiz-Default.gridset')
        await this._gridset.importFromFile(fn)
        this.entries = this._gridset.entries
        let entry = this.entries.find((a) => a.static_file == 'Grids\\cause1\\grid.xml')
        if (entry != null) {
          this.targetEntry = entry
          this.currentStep = 2
        } else {
          this._gridset = null
          this.entries = null
          this.currentStep = 1
          this.showBack = true
        }
      })()
    },
    methods: {
      didScroll () {
        this._setNeedsLoadMoreIfAtBottom()
      },
      didChangeImportFile (event) {
        let file = event.target.files[0]
        if (file) {
          let reader = new FileReader()
          reader.onload = async (evt) => {
            let data = Buffer.from(evt.target.result)
            this._gridset = new GridSet()
            await this._gridset.importFromBuffer(data, file.name)
            this.entries = this._gridset.entries
          }
          reader.readAsArrayBuffer(file)
        } else {
          this._gridset = null
          this.entries = []
        }
      },
      didClickEntry (entry, event) {
        event.preventDefault()
        if (entry.dynamic_files.length == 0) {
          alert('entry has no dynamic files!')
          return
        }
        this.targetEntry = entry
        this.currentStep = 2
      },
      didClickStepBack () {
        this.currentStep -= 1
      },
      _setNeedsLoadMoreIfAtBottom () {
        if (this._loadMoreTriggerTimeout == null) {
          this._loadMoreTriggerTimeout = setTimeout(() => {
            this._loadMoreTriggerTimeout = null
            if (!this._noMore && !this._loading) {
              this._loadMoreIfIsAtBottom()
            }
          }, 200)
        }
      },
      _loadMoreIfIsAtBottom () {
        if (isElementInView(this.$refs.listEndIndicator) &&
            !this._noMore && this._loading) {
          return this.loadMore()
        }
        return Promise.resolve()
      },
      didClickSearch () {
        this.images = [].concat(this.selectedImages)
        this._noMore = false
        this.loadMore()
      },
      didClickImagePanel (image) {
        let idx = this.selectedImages.indexOf(image)
        if (idx == -1) {
          if (this.targetEntry.dynamic_files.length - this.selectedImages.length == 0) {
            return
          }
          this.selectedImages.push(image)
        } else {
          this.selectedImages.splice(idx, 1)
        }
      },
      didChangeImageNumber (image, event) {
        image.imageNumber = event.target.value
      },
      async didClickExport () {
        if (this.selectedImages.length != this.targetEntry.dynamic_files.length) {
          alert(`You should select ${this.targetEntry.dynamic_files.length} image(s)`)
          return
        }
        let images = this.selectedImages.sort((a, b) => {
          a = parseInt(a.imageNumber)
          b = parseInt(b.imageNumber)
          if (isNaN(a)) {
            a = 0
          }
          if (isNaN(b)) {
            b = 0
          }
          return a == b ?
            this.selectedImages.indexOf(a) - this.selectedImages.indexOf(b) :
            a - b
        })
        // modify images
        let checksum_cache = {}
        let basedir = path.dirname(this._gridset.filemap.name)
        this._gridset.clearModifyMemory()
        for (let i = 0; i < this.targetEntry.dynamic_files.length; i++) {
          /*
            DynamicFiles of target grid should be sample images
            that will get replaced according to their checksum,
            including any other file in the gridset that has the same checksum

            Image data is taken from matched selected image tag
          */
          let imageurl = images[i].url
          let dynfn = this.targetEntry.dynamic_files[i].replace(/\\/g, '/')
          let targetfn = path.join(basedir, dynfn)
                .replace(/^(\.\/|\/)/, '')
          let checksum = await this._gridset.getFileChecksum(targetfn)
          let subimgs = Array.from(document.querySelectorAll('img'))
              .filter((a) => a.src == imageurl)
          if (subimgs.length == 0) {
            throw new Error('Image not found!, ' + imageurl)
          }
          let newdata = await this._imageAsPNGData(subimgs[0])
          await this._gridset.modifyFileByChecksum(newdata, checksum, checksum_cache)
        }
        // export it
        let res = await remote.dialog.showSaveDialog({
          title: 'export gridset',
          defaultPath: fs_friendly_name(this.searchQuery || 'output') + '.gridset',
        })
        if (res.canceled) {
          return
        }
        try {
          await this._gridset.saveToFile(res.filePath)
        } catch (err) {
          console.error(err)
          alert('Error: ' + (err.message ? err.message : err))
        }
      },
      async loadMore () {
        if (this._noMore || this._loading) {
          return
        }
        this._loading = true
        // load
        var images = await (new Promise((resolve, reject) => {
          gis({
            searchTerm: this.searchQuery,
            queryStringAddition: this.searchSafe ? '&safe=active' : '',
          }, (err, results) => {
            if (err) {
              reject(err)
            } else {
              resolve(results)
            }
          })
        }))
        images.forEach((image) => {
          image.imageNumber = 0
        })
        // received
        this.images = this.images.concat(images)
        this._loading = false
        this._noMore = true
      },
      _imageAsPNGData (image) {
        let canvas = document.createElement('canvas')
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
        let ctx = canvas.getContext('2d')
        ctx.drawImage(image, 0, 0)
        return new Promise((resolve) => {
          canvas.toBlob((blob) => {
            let reader = new FileReader()
            reader.onload = async (evt) => {
              resolve(Buffer.from(evt.target.result))
            }
            reader.readAsArrayBuffer(blob)
          }, 'image/png')
        })
      },
    },
    computed: {
    },
  }
</script>

<style lang="scss">
@import '../variables';
.inpfilebtn {
  position: relative;
  overflow: hidden;
  input[type=file] {
    position: absolute;
    left: -50px;
    top: -50px;
    width: 250px;
    height: 150px;
    z-index: 1;
    cursor: pointer;
  }
}
.main-page {
  button.l-disabled {
    background-color: $light-grey;
    cursor: default;
    color: $lite-stroke;
  }
  div.loading-spinner-wrp {
    position: relative;
    width: 20px;
    height: 20px;
    box-sizing: content-box;
  }
  .list-end-indicator {
    height: 30px;
  }
  .main-header {
    border-bottom: 1px solid $lite-stroke;
  }
  .select-image {
    min-width: 11em;
    width: 33.33%;
    @media (min-width: 900px) {
      width: 25%;
    }
    padding: 1em;
    box-sizing: border-box;
    .title {
      font-weight: normal;
      margin: 0;
    }
    .panel {
      cursor: pointer;
    }
    &.selected .panel {
      border: 2px solid $primary-color;
      box-shadow: 0px 0px 10px $primary-color;
    }
  }
  .publisher-small-icon {
    height: 1em;
    width: auto;
    border-radius: 0.2em;
  }
}
.flex-autoscroll {
 flex: 1 1 0;
 overflow: auto;
}
</style>

