
/* 福岡市のドットマップを作成するプログラム */

// 地図の細かさ：横方向に約100マス
const MAP_COLUMNS = 100;

// 地図を表示する場所
const mapArea = document.querySelector(".map-area");

// 福岡市の行政区域データを取得
async function createFukuokaMap() {
  try {
    const response = await fetch(
      "https://wapi.bodik.jp/estat/polygon?organ_code=401307"
    );

    if (!response.ok) {
      throw new Error("地図データを取得できませんでした");
    }

    const geojson = await response.json();

    // GeoJSONの形状データを取り出す
    const features = geojson.type === "FeatureCollection"
      ? geojson.features
      : [geojson];

    const polygons = [];

    // Polygon / MultiPolygon の両方に対応
    features.forEach(feature => {
      const geometry = feature.geometry;

      if (!geometry) return;

      if (geometry.type === "Polygon") {
        polygons.push(geometry.coordinates);
      }

      if (geometry.type === "MultiPolygon") {
        polygons.push(...geometry.coordinates);
      }
    });

    if (polygons.length === 0) {
      throw new Error("福岡市の形状が見つかりません");
    }

  
// 福岡市本体から大きく離れた島を除外する
// 各ポリゴンの外周から面積を計算し、
// 最大の陸地区域を基準に表示対象を決める

// 緯度経度からポリゴンの概算面積を求める
function polygonArea(ring) {
  let area = 0;

  for (let i = 0; i < ring.length; i++) {
    const current = ring[i];
    const next = ring[(i + 1) % ring.length];

    area += current[0] * next[1] - next[0] * current[1];
  }

  return Math.abs(area) / 2;
}

// 一定以上の大きさの区域だけ残す
const areas = polygons.map(polygon => polygonArea(polygon[0]));
const largestArea = Math.max(...areas);

const mainPolygons = polygons.filter((polygon, index) => {
  return areas[index] >= largestArea * 0.001;
});

// 表示対象のポリゴンを更新する
polygons.length = 0;
polygons.push(...mainPolygons);

// 残した区域の座標を取得する
const points = polygons.flat(2);

    const longitudes = points.map(point => point[0]);
    const latitudes = points.map(point => point[1]);

    const minX = Math.min(...longitudes);
    const maxX = Math.max(...longitudes);
    const minY = Math.min(...latitudes);
    const maxY = Math.max(...latitudes);

    // 緯度経度の縦横比を補正
    const latitudeCenter = (minY + maxY) / 2;
    const longitudeScale = Math.cos(
      latitudeCenter * Math.PI / 180
    );

    const width = (maxX - minX) * longitudeScale;
    const height = maxY - minY;

    const rows = Math.max(
      1,
      Math.round(MAP_COLUMNS * height / width)
    );

    // 地図を描くCanvasを作成
    const canvas = document.createElement("canvas");
    canvas.width = MAP_COLUMNS;
    canvas.height = rows;
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    canvas.style.imageRendering = "pixelated";

    const ctx = canvas.getContext("2d");

    // 白いマスを描く
    ctx.fillStyle = "#ffffff";

    
/* 福岡市の地図を正しい比率で中央に配置する */

// 地図の外側に残す余白（マス数）
const margin = 2;

// 経度方向の距離を緯度に合わせて補正する
const correctedWidth = (maxX - minX) * longitudeScale;
const correctedHeight = maxY - minY;

// 描画に使える横幅と縦幅
const availableWidth = MAP_COLUMNS - margin * 2;
const availableHeight = rows - margin * 2;

// 縦横比を保つための倍率
const scale = Math.min(
  availableWidth / correctedWidth,
  availableHeight / correctedHeight
);

// 描画後の地図の大きさ
const drawnWidth = correctedWidth * scale;
const drawnHeight = correctedHeight * scale;

// 地図を中央に配置するための位置
const offsetX = (MAP_COLUMNS - drawnWidth) / 2;
const offsetY = (rows - drawnHeight) / 2;

// 緯度経度をCanvas上の座標に変換する
function convert(point) {
  return [
    (point[0] - minX) * longitudeScale * scale + offsetX,
    (maxY - point[1]) * scale + offsetY
  ];
}

   

    // 福岡市の区域を塗る
    polygons.forEach(polygon => {
      ctx.beginPath();

      polygon.forEach(ring => {
        ring.forEach((point, index) => {
          const [x, y] = convert(point);

          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });

        ctx.closePath();
      });

      ctx.fill("evenodd");
    });

    // いったん元の地図を画像として保存
    const mapImage = ctx.getImageData(
      0, 0, MAP_COLUMNS, rows
    );

    // ドットを少し離して描き直す
    const dotCanvas = document.createElement("canvas");
    dotCanvas.width = MAP_COLUMNS * 5;
    dotCanvas.height = rows * 5;

    const dotCtx = dotCanvas.getContext("2d");

    // 透明な背景の上に、白い正方形を並べる
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < MAP_COLUMNS; x++) {
        const index = (y * MAP_COLUMNS + x) * 4 + 3;

        if (mapImage.data[index] > 127) {
          dotCtx.fillStyle = "#ffffff";
          dotCtx.fillRect(x * 5, y * 5, 4, 4);
        }
      }
    }

    // 地図の表示場所を置き換える
    mapArea.innerHTML = "";
    mapArea.appendChild(dotCanvas);

    
// 地図の大きさと配置を調整する
// ドットの形を崩さず、横幅いっぱいに表示する
dotCanvas.style.width = "100%";
dotCanvas.style.maxWidth = "100%";
dotCanvas.style.height = "auto";
dotCanvas.style.display = "block";
dotCanvas.style.imageRendering = "pixelated";

// 地図の周囲の余白を小さくする
mapArea.style.height = "auto";
mapArea.style.minHeight = "0";
mapArea.style.padding = "5px";

// 地図を中央に配置する
mapArea.style.display = "flex";
mapArea.style.justifyContent = "center";
mapArea.style.alignItems = "center";


    // スマホでも地図全体が収まるようにする
    dotCanvas.style.width = "100%";
    dotCanvas.style.height = "auto";
    dotCanvas.style.imageRendering = "pixelated";

  } catch (error) {
    console.error(error);
    mapArea.textContent =
      "地図を読み込めませんでした。接続を確認してください。";
  }
}

// ページを開いたときに地図を作る
createFukuokaMap();
