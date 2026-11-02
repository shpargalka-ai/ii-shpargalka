/* ИИ-Шпаргалка — генератор QR-кодов без внешних библиотек.
   Стандарт QR (ISO/IEC 18004): байтовый режим UTF-8, уровень коррекции M, версии 1–40.
   Использование: QR.draw(canvas, 'https://...', { size: 240 }) */
(function () {
  'use strict';

  // Коррекция ошибок, уровень M: ECC-кодовых слов в блоке и число блоков для версий 1–40
  var ECC_PER_BLOCK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
  var NUM_BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];
  var ECL_FORMAT_BITS = 0; // M

  function rawDataModules(ver) {
    var result = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var numAlign = Math.floor(ver / 7) + 2;
      result -= (25 * numAlign - 10) * numAlign - 55;
      if (ver >= 7) result -= 36;
    }
    return result;
  }

  function dataCodewords(ver) {
    return Math.floor(rawDataModules(ver) / 8) - ECC_PER_BLOCK[ver] * NUM_BLOCKS[ver];
  }

  function alignmentPositions(ver, size) {
    if (ver === 1) return [];
    var numAlign = Math.floor(ver / 7) + 2;
    var step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
    var result = [6];
    for (var pos = size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
    return result;
  }

  // Арифметика в поле Галуа GF(2^8) с многочленом 0x11D
  function gfMul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }

  function rsDivisor(degree) {
    var result = [];
    for (var i = 0; i < degree - 1; i++) result.push(0);
    result.push(1);
    var root = 1;
    for (var k = 0; k < degree; k++) {
      for (var j = 0; j < result.length; j++) {
        result[j] = gfMul(result[j], root);
        if (j + 1 < result.length) result[j] ^= result[j + 1];
      }
      root = gfMul(root, 0x02);
    }
    return result;
  }

  function rsRemainder(data, divisor) {
    var result = divisor.map(function () { return 0; });
    data.forEach(function (b) {
      var factor = b ^ result.shift();
      result.push(0);
      divisor.forEach(function (coef, i) { result[i] ^= gfMul(coef, factor); });
    });
    return result;
  }

  function utf8Bytes(str) {
    var bytes = [];
    var enc = unescape(encodeURIComponent(str));
    for (var i = 0; i < enc.length; i++) bytes.push(enc.charCodeAt(i));
    return bytes;
  }

  function encode(text) {
    var bytes = utf8Bytes(text);

    // Подбираем минимальную версию
    var ver, bitsNeeded;
    for (ver = 1; ver <= 40; ver++) {
      var countBits = ver <= 9 ? 8 : 16;
      bitsNeeded = 4 + countBits + bytes.length * 8;
      if (bitsNeeded <= dataCodewords(ver) * 8) break;
    }
    if (ver > 40) throw new Error('Слишком длинный текст для QR-кода');

    // Битовый поток: режим «байты» (0100), длина, данные
    var bits = [];
    function push(val, len) {
      for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
    }
    push(4, 4);
    push(bytes.length, ver <= 9 ? 8 : 16);
    bytes.forEach(function (b) { push(b, 8); });

    var capacity = dataCodewords(ver) * 8;
    push(0, Math.min(4, capacity - bits.length));
    push(0, (8 - bits.length % 8) % 8);
    for (var pad = 0xEC; bits.length < capacity; pad ^= 0xEC ^ 0x11) push(pad, 8);

    var data = [];
    for (var i = 0; i < bits.length; i += 8) {
      var byte = 0;
      for (var j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
      data.push(byte);
    }

    // Блоки с кодами Рида — Соломона и чередование
    var numBlocks = NUM_BLOCKS[ver];
    var eccLen = ECC_PER_BLOCK[ver];
    var rawCodewords = Math.floor(rawDataModules(ver) / 8);
    var numShort = numBlocks - rawCodewords % numBlocks;
    var shortLen = Math.floor(rawCodewords / numBlocks);
    var divisor = rsDivisor(eccLen);
    var blocks = [];
    for (var b = 0, k = 0; b < numBlocks; b++) {
      var dat = data.slice(k, k + shortLen - eccLen + (b < numShort ? 0 : 1));
      k += dat.length;
      var ecc = rsRemainder(dat, divisor);
      if (b < numShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    var codewords = [];
    for (var c = 0; c < blocks[0].length; c++) {
      for (var bi = 0; bi < blocks.length; bi++) {
        if (c !== shortLen - eccLen || bi >= numShort) codewords.push(blocks[bi][c]);
      }
    }

    // Матрица
    var size = ver * 4 + 17;
    var modules = [], isFunc = [];
    for (var y = 0; y < size; y++) {
      modules.push(new Array(size).fill(false));
      isFunc.push(new Array(size).fill(false));
    }
    function setF(x, y, dark) {
      modules[y][x] = dark;
      isFunc[y][x] = true;
    }

    // Линии синхронизации
    for (var t = 0; t < size; t++) {
      setF(6, t, t % 2 === 0);
      setF(t, 6, t % 2 === 0);
    }
    // Поисковые узоры
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(function (p) {
      for (var dy = -4; dy <= 4; dy++) {
        for (var dx = -4; dx <= 4; dx++) {
          var xx = p[0] + dx, yy = p[1] + dy;
          if (xx >= 0 && xx < size && yy >= 0 && yy < size) {
            var dist = Math.max(Math.abs(dx), Math.abs(dy));
            setF(xx, yy, dist !== 2 && dist !== 4);
          }
        }
      }
    });
    // Выравнивающие узоры
    var al = alignmentPositions(ver, size);
    for (var ai = 0; ai < al.length; ai++) {
      for (var aj = 0; aj < al.length; aj++) {
        if ((ai === 0 && aj === 0) || (ai === 0 && aj === al.length - 1) || (ai === al.length - 1 && aj === 0)) continue;
        for (var ady = -2; ady <= 2; ady++) {
          for (var adx = -2; adx <= 2; adx++) {
            setF(al[ai] + adx, al[aj] + ady, Math.max(Math.abs(adx), Math.abs(ady)) !== 1);
          }
        }
      }
    }
    // Резервируем место под формат и версию
    drawFormat(0);
    if (ver >= 7) {
      var rem = ver;
      for (var vi = 0; vi < 12; vi++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      var vbits = ver << 12 | rem;
      for (var vb = 0; vb < 18; vb++) {
        var color = ((vbits >>> vb) & 1) !== 0;
        var va = size - 11 + vb % 3, vbb = Math.floor(vb / 3);
        setF(va, vbb, color);
        setF(vbb, va, color);
      }
    }

    function drawFormat(mask) {
      var d = ECL_FORMAT_BITS << 3 | mask;
      var r = d;
      for (var fi = 0; fi < 10; fi++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      var fb = (d << 10 | r) ^ 0x5412;
      function bit(i) { return ((fb >>> i) & 1) !== 0; }
      for (var i = 0; i <= 5; i++) setF(8, i, bit(i));
      setF(8, 7, bit(6));
      setF(8, 8, bit(7));
      setF(7, 8, bit(8));
      for (i = 9; i < 15; i++) setF(14 - i, 8, bit(i));
      for (i = 0; i < 8; i++) setF(size - 1 - i, 8, bit(i));
      for (i = 8; i < 15; i++) setF(8, size - 15 + i, bit(i));
      setF(8, size - 8, true);
    }

    // Размещаем данные змейкой
    var bitIndex = 0, total = codewords.length * 8;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var jj = 0; jj < 2; jj++) {
          var x = right - jj;
          var upward = ((right + 1) & 2) === 0;
          var yy2 = upward ? size - 1 - vert : vert;
          if (!isFunc[yy2][x] && bitIndex < total) {
            modules[yy2][x] = ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) !== 0;
            bitIndex++;
          }
        }
      }
    }

    // Маски: выбираем ту, у которой меньше штраф
    function maskFn(m, x, y) {
      switch (m) {
        case 0: return (x + y) % 2 === 0;
        case 1: return y % 2 === 0;
        case 2: return x % 3 === 0;
        case 3: return (x + y) % 3 === 0;
        case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
        case 5: return x * y % 2 + x * y % 3 === 0;
        case 6: return (x * y % 2 + x * y % 3) % 2 === 0;
        default: return ((x + y) % 2 + x * y % 3) % 2 === 0;
      }
    }
    function applyMask(m) {
      for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
          if (!isFunc[y][x] && maskFn(m, x, y)) modules[y][x] = !modules[y][x];
        }
      }
    }
    function penalty() {
      var score = 0, x, y, run, dark = 0;
      for (y = 0; y < size; y++) {
        run = 1;
        for (x = 1; x < size; x++) {
          if (modules[y][x] === modules[y][x - 1]) {
            run++;
            if (run === 5) score += 3; else if (run > 5) score++;
          } else run = 1;
        }
      }
      for (x = 0; x < size; x++) {
        run = 1;
        for (y = 1; y < size; y++) {
          if (modules[y][x] === modules[y - 1][x]) {
            run++;
            if (run === 5) score += 3; else if (run > 5) score++;
          } else run = 1;
        }
      }
      for (y = 0; y < size - 1; y++) {
        for (x = 0; x < size - 1; x++) {
          var c = modules[y][x];
          if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) score += 3;
        }
      }
      // Узоры, похожие на поисковые: 1011101 с четырьмя светлыми рядом
      var pat1 = [true, false, true, true, true, false, true, false, false, false, false];
      var pat2 = [false, false, false, false, true, false, true, true, true, false, true];
      function matchAt(get) {
        var m1 = true, m2 = true;
        for (var i = 0; i < 11; i++) {
          var v = get(i);
          if (v !== pat1[i]) m1 = false;
          if (v !== pat2[i]) m2 = false;
        }
        return (m1 ? 1 : 0) + (m2 ? 1 : 0);
      }
      for (y = 0; y < size; y++) {
        for (x = 0; x <= size - 11; x++) {
          score += 40 * matchAt(function (i) { return modules[y][x + i]; });
          score += 40 * matchAt(function (i) { return modules[x + i][y]; });
        }
      }
      for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (modules[y][x]) dark++;
      var totalM = size * size;
      var kk = Math.ceil(Math.abs(dark * 20 - totalM * 10) / totalM) - 1;
      score += Math.max(0, kk) * 10;
      return score;
    }

    var bestMask = 0, best = Infinity;
    for (var m = 0; m < 8; m++) {
      applyMask(m);
      drawFormat(m);
      var p = penalty();
      if (p < best) { best = p; bestMask = m; }
      applyMask(m); // снимаем маску (XOR обратим)
    }
    applyMask(bestMask);
    drawFormat(bestMask);

    return { size: size, version: ver, modules: modules };
  }

  /* Рисует QR на canvas. Всегда чёрным по белому — так его надёжно читают камеры. */
  function draw(canvas, text, opts) {
    opts = opts || {};
    var qr = encode(text);
    var margin = opts.margin == null ? 4 : opts.margin;
    var cells = qr.size + margin * 2;
    var cssSize = opts.size || 240;
    var ratio = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    var scale = Math.max(1, Math.floor(cssSize * ratio / cells));
    var px = cells * scale;
    canvas.width = px;
    canvas.height = px;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = '#000000';
    for (var y = 0; y < qr.size; y++) {
      for (var x = 0; x < qr.size; x++) {
        if (qr.modules[y][x]) ctx.fillRect((x + margin) * scale, (y + margin) * scale, scale, scale);
      }
    }
    return qr;
  }

  window.QR = { encode: encode, draw: draw };
})();
