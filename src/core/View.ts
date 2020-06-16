import echarts from 'echarts';
import { Candle, DataStore } from '@/data/Data';
import { TargetResults } from '@/lib/target';
import { DateFormat } from '@/lib/time';
import { FMex } from '@/api/FMex';
import Vue from 'vue';

export interface ViewOptions {
  Resolution: FMex.Resolution;
  CoinSymbol: FMex.CoinSymbol;
  Target: string[];
  CandleNum: number;
  DataHook?: (rawData: Candle[], Options: ViewOptions, opt: any) => any;
}

export interface Target {
  value: string;
  children?: Target[];
}

let close: any = null;

export const ViewDrawLine = (echart: echarts.ECharts, Options: ViewOptions) => {
  const upColor = '#0cf49b';
  const downColor = '#fd1050';
  echart.clear();
  echart.setOption({
    title: {
      text: '',
      top: 'top',
      left: 'left',
      textStyle: {
        color: '#f09',
      },
    },
    backgroundColor: '#21202D',
    legend: {
      // data: ['MA5', 'MA15', 'MA30', 'MA60'],
      inactiveColor: '#777',
      textStyle: {
        color: '#fff',
      },
    },

    grid: [
      {
        left: '10%',
        right: '8%',
        height: '50%',
      },
      {
        left: '10%',
        right: '8%',
        top: '63%',
        height: '16%',
      },
    ],
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        animation: false,
        type: 'cross',
        lineStyle: {
          color: '#376df4',
          width: 2,
          opacity: 1,
        },
      },
      backgroundColor: 'rgba(245, 245, 245, 0.8)',
      borderWidth: 1,
      borderColor: '#ccc',
      padding: 10,
      textStyle: {
        color: '#000',
      },
      // position: function(pos: any, params, el, elRect, size: any) {
      //   const obj: any = { top: 10 };
      //   obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 30;
      //   return obj;
      // },
    },
    axisPointer: {
      link: { xAxisIndex: 'all' } as any,
      label: {
        backgroundColor: '#777',
      },
    },
    visualMap: {
      show: false,
      seriesIndex: 1,
      dimension: 2,
      pieces: [
        {
          value: -1,
          color: downColor,
        },
        {
          value: 1,
          color: upColor,
        },
      ],
    } as any,
    toolbox: {
      feature: {
        // dataZoom: {
        //   yAxisIndex: false,
        // },
        // brush: {
        //   type: ['lineX', 'clear'],
        // },
      },
    },
    xAxis: [
      {
        type: 'category',
        scale: true,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#8392A5' }, onZero: false },
        splitLine: { show: false },
        splitNumber: 10,
        min: 'dataMin',
        max: 'dataMax',
        axisPointer: {
          z: 100,
        },
      },
      {
        type: 'category',
        gridIndex: 1,
        scale: true,
        boundaryGap: false,
        axisLine: { onZero: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        splitNumber: 10,
        min: 'dataMin',
        max: 'dataMax',
      },
    ],
    yAxis: [
      // {
      //   scale: true,
      //   splitArea: {
      //     show: true,
      //   },
      // },
      {
        scale: true,
        axisLine: { lineStyle: { color: '#8392A5' } },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#8392A5',
            opacity: 0.2,
          },
        },
        position: 'right',
        type: 'value',
        // splitArea: {
        //   show: true,
        // },
      },
      {
        scale: true,
        gridIndex: 1,
        splitNumber: 2,
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      // {
      //   scale: true,
      //   axisLine: { lineStyle: { color: '#8392A5' } },
      //   splitLine: { show: false },
      //   position: 'right',
      //   type: 'value',
      // },
    ],
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: [0, 1],
        start: 88,
        end: 100,
      },
      {
        show: true,
        xAxisIndex: [0, 1],
        type: 'slider',
        top: '85%',
        start: 88,
        end: 100,
        textStyle: { color: '#fff' },
        dataBackground: {
          areaStyle: { color: '#ccc' },
          lineStyle: { color: '#fff' },
        },
        // axisLine: { lineStyle: { color: '#8392A5' } },
      },
    ],
    animation: false,
  });
  getData(echart, Options);
};

async function getData(echart: echarts.ECharts, Options: ViewOptions) {
  if (close) close();
  echart.showLoading();
  let first = true;
  close = await DataStore.state.DataSource.GetCandles(Options, (dates: any) => {
    if (first) {
      first = false;
      echart.hideLoading();
    }

    echart.setOption(getOption(dates, Options));
  });
}

function getOption(rawData: Candle[], Options: ViewOptions) {
  const dates: string[] = [];
  const kData = {
    k: [] as number[][],
    v: [] as number[][],
  };
  rawData.forEach((item, index) => {
    dates.push(DateFormat(item.timestamp, 'yyyy-MM-dd hh:mm'));
    kData.k.push([item.open, item.close, item.high, item.low]);
    kData.v.push([index, item.volume, item.close > item.open ? 1 : -1]);
  });
  // console.log(rawData);

  const opt: any = {
    title: {
      text: DateFormat(Vue.DataStore.state.LastCandleTime, 'yyyy-MM-dd hh:mm:ss'),
    },
    xAxis: [
      {
        data: dates,
      },
      {
        data: dates,
      },
    ],
    series: [
      {
        type: 'k',
        name: Options.Resolution,
        data: kData.k,
        itemStyle: {
          color: '#0CF49B',
          color0: '#FD1050',
          borderColor: '#0CF49B',
          borderColor0: '#FD1050',
        },
        markPoint: {
          symbol: 'pin',
          data: [
            // {
            //   name: 'XX标点',
            //   coord: ['2020-06-06 04:45', 9800],
            //   value: 9800,
            //   itemStyle: {
            //     color: 'rgb(41,60,85)',
            //   },
            // },
          ],
          tooltip: {
            formatter: function(param: any) {
              return param.name + '<br>' + (param.data.coord || '');
            },
          },
        },
        markArea: {
          silent: true,
          data: [],
        },
        markLine: {
          // silent: true, // 不响应鼠标
          symbol: ['none', 'none'],
          symbolSize: [10, 10],
          data: [
            {
              name: '当前价格',
              yAxis: rawData.length ? rawData[rawData.length - 1].close : 0,
            },
            // {
            //   name: 'min line on close',
            //   type: 'min',
            //   // yAxis: min.toString(),
            //   valueDim: 'lowest',
            // },
            // {
            //   name: 'max line on close',
            //   type: 'max',
            //   // yAxis: max.toString(),
            //   valueDim: 'highest',
            // },
          ],
        },
      },
      {
        name: 'Volume',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: kData.v,
      },
    ],
  };
  TargetResults(rawData, Options, opt);
  if (Options.DataHook) Options.DataHook(rawData, Options, opt);
  return opt;
}
