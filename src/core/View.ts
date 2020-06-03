import echarts from 'echarts';
import { DataSource } from '@/data/Data';
import BigNumber from 'bignumber.js';

export interface ViewOptions {
  Granularity: string;
  Target: string[][];
}

export interface Target {
  value: string;
  children?: Target[];
}
export const Targets: Target[] = [
  {
    value: 'MA-移动平均线',
    children: [{ value: 'MA-移动平均线3' }, { value: 'MA-移动平均线5' }, { value: 'MA-移动平均线15' }],
  },
  {
    value: 'BOLL-布林带',
    children: [{ value: 'BOLL-布林带3' }, { value: 'BOLL-布林带5' }, { value: 'BOLL-布林带15' }],
  },
];

let close: any = null;

export const ViewDrawLine = (echart: echarts.ECharts, daHandler: DataSource, Options: ViewOptions) => {
  echart.clear();
  echart.setOption({
    backgroundColor: '#21202D',
    legend: {
      data: ['MA5', 'MA15', 'MA30', 'MA60'],
      inactiveColor: '#777',
      textStyle: {
        color: '#fff',
      },
    },
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
    },
    xAxis: {
      type: 'category',
      axisLine: { lineStyle: { color: '#8392A5' } },
    },
    yAxis: {
      scale: true,
      axisLine: { lineStyle: { color: '#8392A5' } },
      splitLine: { show: false },
    },
    grid: {
      bottom: 80,
    },
    dataZoom: [
      {
        textStyle: {
          color: '#8392A5',
        },
        handleSize: '80%',
        dataBackground: {
          areaStyle: {
            color: '#8392A5',
          },
          lineStyle: {
            opacity: 0.8,
            color: '#8392A5',
          },
        },
        handleStyle: {
          color: '#fff',
          shadowBlur: 3,
          shadowColor: 'rgba(0, 0, 0, 0.6)',
          shadowOffsetX: 2,
          shadowOffsetY: 2,
        },
      },
      {
        type: 'inside',
      },
    ],
    animation: true,
  });
  getData(echart, daHandler, Options);
};

async function getData(echart: echarts.ECharts, daHandler: DataSource, Options: ViewOptions) {
  if (close) close();
  close = daHandler.Api.GetCandles('BTC-USD-SWAP', Options, (dates) => echart.setOption(getOption(dates, Options)));
}

function calculateMA(dayCount: any, data: any) {
  const result = [];
  for (let i = 0, len = data.length; i < len; i++) {
    if (i < dayCount) {
      result.push('-');
      continue;
    }
    let sum = new BigNumber(0);
    for (let j = 0; j < dayCount; j++) {
      sum = sum.plus(data[i - j][1]);
    }
    result.push(sum.div(dayCount).toFixed(2));
  }
  return result;
}

function getOption(rawData: string[][], Options: ViewOptions) {
  const dates = rawData.map((item) => item[0]);
  const data = rawData.map(function(item) {
    return [+item[1], +item[2], +item[5], +item[6]];
  });
  // const opt: echarts.EChartOption = {
  const opt: any = {
    xAxis: {
      data: dates,
    },
    series: [
      {
        type: 'k',
        name: Options.Granularity,
        data: data,
        itemStyle: {
          color: '#0CF49B',
          color0: '#FD1050',
          borderColor: '#0CF49B',
          borderColor0: '#FD1050',
        },
        markPoint: {
          // label: {
          //   normal: {
          //     formatter: function(param: any) {
          //       return param != null ? Math.round(param.value) : '';
          //     },
          //   },
          // },
          data: [
            // {
            //   name: 'XX标点',
            //   coord: ['2013/5/31', 2300],
            //   value: 2300,
            //   itemStyle: {
            //     color: 'rgb(41,60,85)',
            //   },
            // },
            // {
            //   name: 'highest value',
            //   type: 'max',
            //   valueDim: 'highest',
            // },
            // {
            //   name: 'lowest value',
            //   type: 'min',
            //   valueDim: 'lowest',
            // },
            // {
            //   name: 'average value on close',
            //   type: 'average',
            //   valueDim: 'close',
            // },
          ],
          tooltip: {
            formatter: function(param: any) {
              return param.name + '<br>' + (param.data.coord || '');
            },
          },
        },
        markLine: {
          silent: true, // 不响应鼠标
          symbol: ['none', 'none'],
          symbolSize: [10, 10],
          data: [
            {
              name: '当前价格',
              yAxis: rawData[rawData.length - 1][2],
            },
            {
              name: 'min line on close',
              type: 'min',
              valueDim: 'lowest',
            },
            {
              name: 'max line on close',
              type: 'max',
              valueDim: 'highest',
            },
          ],
        },
      },
      {
        name: 'MA5',
        type: 'line',
        data: calculateMA(5, data),
        smooth: true,
        showSymbol: false,
        lineStyle: {
          width: 1,
        },
      },
      {
        name: 'MA15',
        type: 'line',
        data: calculateMA(15, data),
        smooth: true,
        showSymbol: false,
        lineStyle: {
          width: 2,
        },
      },
      {
        name: 'MA30',
        type: 'line',
        data: calculateMA(30, data),
        smooth: true,
        showSymbol: false,
        lineStyle: {
          width: 2,
        },
      },
      {
        name: 'MA60',
        type: 'line',
        data: calculateMA(60, data),
        smooth: true,
        showSymbol: false,
        lineStyle: {
          width: 3,
        },
      },
    ],
  };
  return opt;
}
