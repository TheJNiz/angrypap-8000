// Regions and silhouette paths from the supplied 1536 × 1024 reference sheets.
// Geometry masks hide sheet backgrounds and labels without changing the source art.
const frames = {
  fork: {sheet:'sling-sheet', rect:[574,505,140,182], outline:[
    [579,522],[590,515],[605,513],[612,516],[617,544],[627,570],[643,589],
    [653,593],[667,580],[677,554],[679,518],[684,508],[700,505],[709,508],
    [710,529],[705,566],[695,594],[679,618],[669,640],[667,677],[657,685],
    [644,686],[627,680],[630,651],[630,630],[621,609],[604,583],[590,556]
  ]},
  base: {sheet:'sling-sheet', rect:[1154,610,351,78], outline:[
    [1164,667],[1181,650],[1201,641],[1228,635],[1260,635],[1290,626],
    [1320,623],[1350,630],[1377,632],[1397,633],[1425,642],[1450,646],
    [1473,652],[1488,668],[1493,681],[1170,682]
  ]},
  wrap: {sheet:'sling-sheet', rect:[942,561,78,71], outline:[
    [951,572],[968,566],[986,564],[1007,567],[1017,574],[1015,589],
    [1017,599],[1014,609],[1016,617],[1009,627],[993,631],[972,630],
    [949,625],[944,619],[947,604],[945,591]
  ]},
  puff: {sheet:'puff-sheet', rect:[532,35,258,218], outline:[
    [535,215],[539,201],[536,187],[541,169],[551,154],[554,137],
    [563,121],[573,114],[578,99],[597,87],[605,72],[626,62],
    [639,52],[658,48],[672,39],[687,37],[696,42],[705,55],
    [719,64],[727,83],[742,101],[754,119],[764,141],[772,170],
    [781,190],[786,209],[780,222],[761,232],[730,243],[688,250],
    [646,251],[605,246],[571,236],[550,232],[540,227]
  ]},
  cup: {sheet:'cup-sheet', rect:[58,25,276,419], outline:[
    [61,81],[66,72],[76,68],[84,54],[103,43],[121,39],[142,36],
    [166,36],[183,30],[198,28],[215,31],[235,33],[257,35],[274,43],
    [291,51],[307,64],[315,69],[324,73],[331,82],[330,94],[320,104],
    [312,110],[280,393],[276,418],[266,431],[246,439],[218,442],
    [184,443],[151,440],[127,434],[116,425],[111,405],[82,107],
    [69,101],[61,92]
  ]}
}

export function registerArtwork(scene){
  for(const [name,{sheet,rect,outline}] of Object.entries(frames)){
    const key='art-'+name
    if(scene.textures.exists(key)) continue
    const texture=scene.textures.get(sheet)
    if(!texture.has(name)) texture.add(name,0,...rect)
    // Clip once into a GPU texture instead of applying a stencil to every
    // moving cup and puff on every frame.
    const sprite=scene.make.image({x:0,y:0,key:sheet,frame:name},false).setOrigin(0)
    const shape=scene.make.graphics({x:0,y:0},false)
    shape.fillStyle(0xffffff).fillPoints(outline.map(([x,y])=>({x:x-rect[0],y:y-rect[1]})),true)
    const mask=shape.createGeometryMask()
    sprite.setMask(mask)
    scene.textures.addDynamicTexture(key,rect[2],rect[3]).draw(sprite)
    sprite.clearMask()
    mask.destroy()
    shape.destroy()
    sprite.destroy()
  }
}

export function clipArtwork(scene,sprite,name){
  return sprite.setTexture('art-'+name)
}
