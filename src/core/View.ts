import echarts from 'echarts';
import { DataSource, Candle, DataStore } from '@/data/Data';
import { TargetResults } from '@/lib/target';
import { DateFormat } from '@/lib/time';

export interface ViewOptions {
  Granularity: string;
  Target: string[];
  CandleNum: number;
  DataHook?: (rawData: Candle[], Options: ViewOptions, opt: any) => any;
}

export interface Target {
  value: string;
  children?: Target[];
}
export const Targets: Target[] = [
  {
    value: 'MA-移动平均线',
    children: [{ value: 'MA5' }, { value: 'MA15' }, { value: 'MA20' }],
  },
  {
    value: 'BOLL-布林线',
    children: [{ value: 'BOLL10' }, { value: 'BOLL20' }, { value: 'BOLL30' }],
  },
  {
    value: 'OBV-能量潮',
    children: [{ value: 'OBV' }, { value: 'OBV*多空比例净额' }],
  },
];

let close: any = null;

export const ViewDrawLine = (echart: echarts.ECharts, Options: ViewOptions) => {
  echart.clear();
  echart.setOption({
    backgroundColor: '#21202D',
    legend: {
      // data: ['MA5', 'MA15', 'MA30', 'MA60'],
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
    yAxis: [
      {
        scale: true,
        axisLine: { lineStyle: { color: '#8392A5' } },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#8392A5',
            opacity: 0.5,
          },
        },
        position: 'right',
        type: 'value',
      },
      {
        scale: true,
        axisLine: { lineStyle: { color: '#8392A5' } },
        splitLine: { show: false },
        position: 'right',
        type: 'value',
      },
    ],
    grid: {
      bottom: 80,
    },
    dataZoom: [
      {
        // xAxisIndex: 0,
        // yAxisIndex: 0,
        // filterMode: 'filter',
        start: 80,
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
    animation: false,
  });
  getData(echart, Options);
};

async function getData(echart: echarts.ECharts, Options: ViewOptions) {
  if (close) close();
  echart.showLoading();
  close = await DataStore.state.DataSource.GetCandles('BTC-USD-SWAP', Options, (dates: any) => {
    echart.hideLoading();
    echart.setOption(getOption(dates, Options));
  });
}

function getOption(rawData: Candle[], Options: ViewOptions) {
  const dates = rawData.map((item) => DateFormat(item.timestamp, 'yyyy-MM-dd hh:mm'));

  const data = rawData.map(function(item) {
    return [item.open, item.close, item.high, item.low];
  });

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
          silent: true, // 不响应鼠标
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
    ],
  };
  TargetResults(rawData, Options, opt);
  if (Options.DataHook) Options.DataHook(rawData, Options, opt);
  return opt;
}
