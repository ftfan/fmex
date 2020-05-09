const fs = require('fs');
const path = require('path');
const CompressionWebpackPlugin = require('compression-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';

const conf = {
  publicPath: isProduction ? '/' : '/',
  assetsDir: 'static',
  productionSourceMap: true,
  css: {
    loaderOptions: {
      sass: {
        prependData: `@import "~@/assets/style/var.scss";`,
      },
    },
  },

  chainWebpack: (config) => {
    config.optimization.delete('splitChunks');
    // config.plugins.delete('pwa');
    config.plugins.delete('workbox');
  },
  configureWebpack: (config) => {
    // 生产环境相关配置
    if (!isProduction) return;
    // gzip压缩
    const productionGzipExtensions = ['html', 'js', 'css'];
    config.plugins.push(
      new CompressionWebpackPlugin({
        filename: '[path].gz[query]',
        algorithm: 'gzip',
        test: new RegExp('\\.(' + productionGzipExtensions.join('|') + ')$'),
        threshold: 10240, // 只有大小大于该值的资源会被处理 10240
        minRatio: 0.8, // 只有压缩率小于这个值的资源才会被处理
        deleteOriginalAssets: false, // 删除原文件
      })
    );

    const CreateChunks = (name, test, priority = 100) => {
      return {
        chunks: 'all',
        test,
        name,
        minChunks: 1,
        maxInitialRequests: 5,
        minSize: 0,
        priority,
      };
    };

    // 构建打包设置
    config.optimization = config.optimization || {};
    config.optimization.splitChunks = config.optimization.splitChunks || {};
    config.optimization.splitChunks.cacheGroups = {
      common: CreateChunks('common', /\.js/, 60),
      other: CreateChunks('nm', /node_modules(.*)\.js/, 150),
      // deps
      // 'bignumber.js': CreateChunks('deps', /node_modules(.*)bignumber\.js/, 200),
      // 'axios': CreateChunks('deps', /node_modules(.*)axios/, 200),
      // 'core-js': CreateChunks('deps', /node_modules(.*)core-js/, 200),
      // vue
      vue: CreateChunks('vue', /node_modules(.*)vue/, 300),
      'element-ui': CreateChunks('element-ui', /node_modules(.*)element-ui/, 999),
      styles: {
        name: 'styles',
        test: /\.(sa|sc|c)ss$/,
        chunks: 'all',
        enforce: true,
      },
      runtimeChunk: {
        name: 'main',
      },
    };
  },
  devServer: {
    disableHostCheck: true,
    open: process.platform === 'darwin',
    host: '0.0.0.0',
    port: 8080,
    https: false,
    hotOnly: false,
    proxy: {
      '/fmex': {
        target: 'https://api.fmex.pro',
        pathRewrite(path, req) {
          return path.replace('/fmex/', '/');
        },
      },
      '/fcoin': {
        target: 'https://api.fcoin.pro/',
        pathRewrite(path, req) {
          return path.replace('/fcoin/', '/');
        },
      },
    },
  },
};

module.exports = conf;
