import { CodeObj, Code } from '@/types/Api';

/**
 * 对用户输入的密码进行乱七八糟的操作
 */
export const PasswordEnc = (password: string) => {
  const arr = password.split('');
  password = CryptoJS.enc.Base64.parse(password);
  console.log(CryptoJS.MD5(password));
  let pwd = CryptoJS.MD5(password).toString();
  for (let i = 0; i < arr.length; i++) {
    pwd = CryptoJS.MD5([arr[i], pwd].join('')).toString();
    if (i % 2 === 0) pwd = CryptoJS.MD5([pwd, arr[i]].join('')).toString();
  }
  return pwd;
};

// 加密
export const EncryptStrByPassword = (password: string, data: string) => {
  try {
    const pwd = PasswordEnc(password);
    const Data = CryptoJS.AES.encrypt(data, pwd).toString();
    const encData = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(Data));

    // 校验
    const res = DecryptStrByPassword(password, encData);
    if (res.Error()) return res;
    if (res.Data !== data) return new CodeObj(Code.Error, null, '加密出现异常');

    return new CodeObj(Code.Success, encData);
  } catch (e) {
    debugger;
    return new CodeObj(Code.Error, null, '加密异常:' + e);
  }
};

// 解密
export const DecryptStrByPassword = (password: string, result: string) => {
  try {
    const pwd = PasswordEnc(password);
    const decData = CryptoJS.enc.Base64.parse(result).toString(CryptoJS.enc.Utf8);
    const bytes = CryptoJS.AES.decrypt(decData, pwd);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return new CodeObj(Code.Success, originalText);
  } catch (e) {
    debugger;
    return new CodeObj(Code.Error, null, '加密异常:' + e);
  }
};
