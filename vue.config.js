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
    config.plugins.delete('pwa');
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
        target: 'https://api.fmex.d73e969.com',
        pathRewrite: { '^/fmex': '' },
        onProxyReq(proxyReq, req, res) {
          proxyReq.removeHeader('x-forwarded-port');
          proxyReq.removeHeader('x-forwarded-host');
          proxyReq.removeHeader('x-forwarded-proto');
          proxyReq.removeHeader('x-forwarded-for');
        },
      },
      '/fcoin': {
        target: 'https://api.fcoin.d73e969.com',
        pathRewrite: { '^/fcoin': '' },
        onProxyReq(proxyReq, req, res) {
          proxyReq.removeHeader('x-forwarded-port');
          proxyReq.removeHeader('x-forwarded-host');
          proxyReq.removeHeader('x-forwarded-proto');
          proxyReq.removeHeader('x-forwarded-for');
        },
      },
      '/okex': {
        target: 'https://www.okex.me',
        pathRewrite: { '^/okex': '' },
        onProxyReq(proxyReq, req, res) {
          proxyReq.removeHeader('x-forwarded-port');
          proxyReq.removeHeader('x-forwarded-host');
          proxyReq.removeHeader('x-forwarded-proto');
          proxyReq.removeHeader('x-forwarded-for');
        },
      },
    },
  },
};

module.exports = conf;
