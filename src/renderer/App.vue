<template>
  <div class="app" id="app">
    <h1>GIF 2 PNG Animation</h1>
    <el-form ref="form" :model="form" label-width="200px" class="form">
      <el-form-item label="请选择图片类型：">
        <el-radio-group v-model="sourceType">
          <el-radio label="png">png文件夹</el-radio>
          <el-radio label="gif" disabled>gif图片</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="请选择gif文件：" v-show="sourceType === 'gif'">
        <div class="upload-box upload-gif">
          <input type="file" accept="image/gif" ref="uploadGif">
          <div class="text">
            <el-button type="primary" circle icon="el-icon-upload2"></el-button>
            <span class="tip">{{ gifValue || '暂无。' }}</span>
          </div>
        </div>
      </el-form-item>
      <el-form-item label="请选择png文件夹：" v-show="sourceType === 'png'">
        <div class="upload-box upload-png">
          <input type="file" webkitdirectory ref="uploadPng">
          <div class="text">
            <el-button type="primary" circle icon="el-icon-upload"></el-button>
            <span class="tip">
              {{ pngValue || '暂无。' }}
              <el-tag type="warning" v-if="pngValue">{{form.files.length}} 张</el-tag>
            </span>
          </div>
        </div>
      </el-form-item>
      <el-form-item label="雪碧图每行个数：">
        <el-input-number size="mini" v-model="form.col" :min="1" :max="10"></el-input-number>
        <span class="tip" v-if="form.files.length">
          共生成{{ ~~(form.files.length/form.col) + +!!(~~(form.files.length%form.col)) }}行{{form.col}}列
        </span>
      </el-form-item>
      <el-form-item label="动画帧数：">
        <el-input-number size="mini" v-model="form.frame" :min="16" :max="60"></el-input-number>
        <el-tooltip content="每秒多少帧/张图片。数字越小动画效果越差。问UI" placement="top">
            <i class="el-icon-question"></i>
        </el-tooltip>
      </el-form-item>
      <el-form-item label="渲染方式：">
        <el-radio-group v-model="form.renderType">
          <el-radio label="img">img</el-radio>
          <el-radio label="canvas">canvas</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="循环播放：">
        <div>
          <el-switch v-model="form.loop" active-color="#13ce66" inactive-color="#ff4949"></el-switch>
          <el-tooltip content="只有1次和无数次" placement="top">
            <i class="el-icon-question"></i>
          </el-tooltip>
        </div>
      </el-form-item>
      <el-form-item label="压缩图片：">
        <div>
          <el-switch v-model="form.imgmin" active-color="#13ce66" inactive-color="#ff4949"></el-switch>
          <el-input v-model="form.tinyApi" placeholder="请输入API,不填则为默认" :style="{
            width: '250px'
          }" v-if="form.imgmin"></el-input>
          <el-tooltip content="使用tinypng熊猫网站压缩。每个API每月500次，其实也可默认多个api自动过限切换" placement="top">
            <i class="el-icon-question"></i>
          </el-tooltip>
        </div>
      </el-form-item>
      <el-form-item>
        <el-button :type="loading ? 'info': 'primary'" @click="onSubmit" :style="{
          width: '300px',
          marginTop: '10px'
        }" :loading="loading">{{loading ? '正在生成...' : '立即生成'}}</el-button>
      </el-form-item>
    </el-form>
    <div class="result" v-if="result.html">
      <hr/>
      <div class="img">
        <div class="l">
          <img :src="result.image" @click="onSave"/>
        </div>
        <div class="r">
          <p>图片名称：{{result.imageName}}</p>
          <p>图片大小：{{result.fullsize}}kb</p>
          <p>是否压缩：{{result.imgmined ? '已成功压缩' : '未成功压缩'}}</p>
          <p v-if="result.imgmined">压缩限额：{{result.tinifyCount}} / 500</p>
          <p>图片尺寸：{{result.fullwidth}}px × {{result.fullheight}}px</p>
          <p>图片行列：{{result.row}}行{{result.col}}列，共{{result.files.length}}帧</p>
          <p>每秒帧数：{{result.frame}}</p>
          <p>每帧尺寸：{{result.width}}px × {{result.height}}px</p>
          <p></p>
          <p>是否循环：{{result.loop ? '循环播放' : '播放一次'}}</p>
          <el-button type="primary" @click="onSave" icon="el-icon-download">保存图片</el-button>
        </div>
      </div>
      <pre v-highlightjs="result.html"><code class="html"></code></pre>
    </div>
  </div>
</template>

<script>
  export default {
    name: "ns-gif2png",
    data() {

      return {
        form: {
          files: [],
          col: 7,
          renderType: 'img',
          imgmin: true,
          frame: 25,
          loop: true,
          tinyApi: localStorage['ns-g2p-tinyApi'] || ''
        },
        sourceType: 'png',
        gifValue: '',
        pngValue: '',
        loading: false,
        result: {
          
        }
      }
    },
    mounted() {
      this.initUpload()
      this.init
    },
    methods: {
      onSubmit(){
        let $vm = this
        let form = $vm.form
        if ( form.files.length < 1 ){
          if ( $vm.sourceType === 'png' ){
            $vm.$notify.error('请选择png文件夹并保证文件夹下存在png图片！')
          }else{
            $vm.$notify.error('请选择gif图片！')
          }
          return false
        }
        localStorage['ns-g2p-tinyApi'] = form.tinyApi
        $vm.loading = true
        $vm.$electron.ipcRenderer.send('generate-png', form)
        $vm.$electron.ipcRenderer.once('generate', (event, result) => {
          this.$notify.success('生成成功！')
          $vm.loading = false
          $vm.result = {
            ...result.form,
            fullwidth:'',
            fullheight:'',
            fullsize:'',
            image:''
          }
          let blob = new Blob( [ result.image ], { type: "image/png" })
          $vm.result.image =  URL.createObjectURL( blob )
          var img = new Image()
          img.src = $vm.result.image
          img.onload = function(){
            $vm.result.fullwidth = img.width
            $vm.result.fullheight = img.height
            $vm.result.fullsize = (blob.size / 1024).toFixed(2)
            $vm.result.blob = result.image
          }
        })
      },
      onSave(){
        let name = this.result.imageName
        let dotIndex = name.lastIndexOf(".")
        this.$electron.ipcRenderer.sendSync('save-file', {
          image: this.result.blob,
          name: name.substr(0,dotIndex),
          ext: name.substr(dotIndex+1)
        })
        this.$notify.success('保存成功！')
      },
      initUpload() {
        const $vm = this
        const uploadGif = this.$refs.uploadGif
        const uploadPng = this.$refs.uploadPng
        uploadGif.addEventListener('change', function (e) {
          $vm.gifValue = this.value || ''
        })
        uploadPng.addEventListener('change', function (e) {
          let path = e.target.files[0] ? e.target.files[0].path : ''
          let files = []
          $vm.pngValue = path ? path.replace(/\\+$/g, '') + '\\*.png' : ''
          if ($vm.pngValue) {
            files = $vm.$electron.ipcRenderer.sendSync('get-files', $vm.pngValue)
          }
          $vm.form.files = files
        })
      }
    }
  };
</script>

<style lang="less">
  body {
    //background: #f5f5f5;
    font-family: microsoft yahei;
          
  }

  .app {
    h1 {
      text-align: center;
      color:rgb(230,52,83);
    }
  }

  .form {
    width: 550px;
    margin: 0 auto;

    .el-form-item__label {
      font-weight: bold;
    }

    .upload-box {
      position: relative;

      input {
        opacity: 0;
        position: absolute;
        width: 100%;
        height: 100%;
        z-index: 1;
        cursor: pointer;
      }

      .text {
        position: relative;
      }
    }

    .tip {
      margin-left: 5px;
      color: #999;
    }
    .el-form-item{
      margin-bottom: 10px;
    }
  }
  .result{
    width: 800px;
    margin:20px auto 0;
    .img{
      display: flex;
      .l{
        width:450px;
        text-align: center;
        img{
          max-width: 100%;
          cursor: pointer;
        }
      }
      .r{
        margin-left: 50px;
        flex:1;
        color:#777;
      }
    }
  }
</style>