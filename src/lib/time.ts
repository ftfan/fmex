/**
 * 可以用 1-2 个占位符 * 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)
 * eg: ("yyyy-MM-dd hh:mm:ss.S")==> 2006-07-02 08:09:04.423
 * ("yyyy-MM-dd E HH:mm:ss") ==> 2009-03-10 二 20:09:04
 * ("yyyy-MM-dd EE hh:mm:ss") ==> 2009-03-10 周二 08:09:04
 * ("yyyy-MM-dd EEE hh:mm:ss") ==> 2009-03-10 星期二 08:09:04
 * ("yyyy-M-d h:m:s.S") ==> 2006-7-2 8:9:4.18
 */
export const DateFormat = (time: number | Date, fmt = 'yyyy-MM-dd hh:mm:ss') => {
  if (typeof time === 'number') {
    if (time < 9999999999) time *= 1000; // 秒级别的数字
    time = new Date(time);
  }

  const o: { [index: string]: number } = {
    'M+': time.getMonth() + 1, // 月份
    'd+': time.getDate(), // 日
    'h+': time.getHours(), // 小时
    'H+': time.getHours(), // 小时
    'm+': time.getMinutes(), // 分
    's+': time.getSeconds(), // 秒
    'q+': Math.floor((time.getMonth() + 3) / 3), // 季度
    S: time.getMilliseconds(), // 毫秒
  };
  const week = ['\u65e5', '\u4e00', '\u4e8c', '\u4e09', '\u56db', '\u4e94', '\u516d'];

  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, (time.getFullYear() + '').substr(4 - RegExp.$1.length));
  }
  if (/(E+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, (RegExp.$1.length > 1 ? (RegExp.$1.length > 2 ? '\u661f\u671f' : '\u5468') : '') + week[time.getDay()]);
  }
  for (const k in o) {
    if (new RegExp(`(${k})`).test(fmt)) {
      fmt = fmt.replace(RegExp.$1, RegExp.$1.length === 1 ? String(o[k]) : ('00' + o[k]).substr(('' + o[k]).length));
    }
  }
  return fmt;
};
