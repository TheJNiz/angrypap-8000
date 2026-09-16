<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import Phaser from 'phaser'
import { registerArtwork, clipArtwork, softenTexture } from './artwork'

const gameHost = ref(null)
const score = ref(0)
const shots = ref(0)
const maxShots = 3
const message = ref('Pull the curry puff backwards and release!')
const showEndScreen = ref(false)
const won = ref(false)
let game

class GameScene extends Phaser.Scene {
  constructor(){ super('GameScene') }

  preload(){
    // Prefix with the app's base URL so assets resolve correctly when
    // served from a GitHub Pages project subpath.
    const asset=p => import.meta.env.BASE_URL+p
    this.load.image('bg',asset('assets/background.jpg'))
    this.load.image('sling-sheet',asset('assets/cartoon/slingshot-sheet.png'))
    this.load.image('puff-sheet',asset('assets/cartoon/puff-sheet.png'))
    this.load.image('cup-sheet',asset('assets/cartoon/cup-sheet.png'))
    this.load.image('thongkee-logo',asset('assets/thongkee-logo.png'))
    this.load.image('foodtale-logo',asset('assets/foodtale-logo.png'))
    this.load.audio('yipee',asset('assets/sounds/yipee.mp3'))
    this.load.audio('bgm',asset('assets/sounds/bgm.mp3'))
  }

  
  create(){
    const W = this.scale.width, H = this.scale.height
    this.groundY = H - 68
    // Keep the landscape proportional; extend the clear sky above it.
    const background = this.textures.get('bg').getSourceImage()
    const backgroundScale = W / background.width
    // The grass line in background.jpg sits at ~63% of the image height, not
    // the middle — align that row with groundY, or the slingshot and cup
    // mountain (placed at groundY) appear to float above the art's grass.
    const backgroundGrassFraction = .633
    const backgroundY = this.groundY - background.height * backgroundGrassFraction * backgroundScale
    const sky = this.textures.getPixel(Math.floor(background.width/2),0,'bg').color
    this.add.rectangle(0,0,W,H,sky).setOrigin(0)
    this.background = this.add.image(0,backgroundY,'bg').setOrigin(0).setScale(backgroundScale)
    this.add.graphics().fillGradientStyle(sky,sky,sky,sky,1,1,0,0)
      .fillRect(0,backgroundY,W,40)
    registerArtwork(this)

    // Scene restarts on every "Play Again"; keep the music playing instead
    // of restarting it from the top each time.
    if(!this.sound.get('bgm')) this.sound.play('bgm',{loop:true,volume:.35})

    // celebration heading
    this.add.text(W/2,34,'8 HOURS • 8,000 CUPS OF KOPI TARIK',{
      fontFamily:'Arial Black, Arial',fontSize:'28px',color:'#ffffff',
      stroke:'#6a351c',strokeThickness:7
    }).setOrigin(.5).setDepth(20)

    this.add.text(W/2,69,'WORLD RECORD CELEBRATION CHALLENGE',{
      fontFamily:'Arial',fontStyle:'bold',fontSize:'15px',color:'#fff7d6',
      stroke:'#6a351c',strokeThickness:4
    }).setOrigin(.5).setDepth(20)

    // Brand credits, centered under the subtitle in a white rounded card.
    // Foodtale's logo is a wide wordmark, so it's sized narrower/shorter
    // than Thong Kee's near-square character mark rather than matching
    // height 1:1 — that would make the wordmark absurdly wide.
    const logoGap=12, cardPad=14
    // Both logos are drawn far smaller than their source resolution
    // (5-7x downscale) with no mipmapping to smooth that out, so the fine
    // linework aliases into blocky noise — pre-soften them first, same fix
    // as the cup/puff art in artwork.js.
    const tkLogo=this.add.image(0,0,softenTexture(this,'thongkee-logo',140)).setOrigin(0,.5).setDepth(21)
    tkLogo.setScale(64/tkLogo.height)
    const ftLogo=this.add.image(0,0,softenTexture(this,'foodtale-logo',280)).setOrigin(0,.5).setDepth(21)
    ftLogo.setScale(40/ftLogo.height)
    const cardW=tkLogo.displayWidth+logoGap+ftLogo.displayWidth+cardPad*2
    const cardH=Math.max(tkLogo.displayHeight,ftLogo.displayHeight)+cardPad*2
    const cardX=W/2-cardW/2, cardY=90
    this.add.graphics().setDepth(20)
      .fillStyle(0xffffff,0.92).fillRoundedRect(cardX,cardY,cardW,cardH,14)
      .lineStyle(2,0x7d2d17,.35).strokeRoundedRect(cardX,cardY,cardW,cardH,14)
    let logoX=cardX+cardPad
    tkLogo.setPosition(logoX,cardY+cardH/2)
    logoX+=tkLogo.displayWidth+logoGap
    ftLogo.setPosition(logoX,cardY+cardH/2)

    this.scoreText = this.add.text(W-16,16,'',{
      fontFamily:'Arial Black, Arial',fontSize:'22px',color:'#ffffff',
      stroke:'#6a351c',strokeThickness:5
    }).setOrigin(1,0).setDepth(20)

    this.shotsText = this.add.text(W-16,46,'',{
      fontFamily:'Arial Black, Arial',fontSize:'16px',color:'#fff7d6',
      stroke:'#6a351c',strokeThickness:4
    }).setOrigin(1,0).setDepth(20)

    this.updateScoreboard()

    this.messageText = this.add.text(W/2,H-34,'',{
      fontFamily:'Arial',fontStyle:'bold',fontSize:'15px',color:'#7d2d17',
      backgroundColor:'#fff7e8',padding:{x:14,y:8}
    }).setOrigin(.5).setDepth(20)
    this.updateMessage()

    this.drawRestartButton()

    this.slingX = 175
    this.slingY = this.groundY - 124
    this.maxPull = 120
    this.launched = false
    this.dragging = false
    this.phase = 'ready'
    this.dragTarget = {x:this.slingX,y:this.slingY}
    this.dragOffset = {x:0,y:0}

    this.bandEnd = {x:this.slingX,y:this.slingY}
    this.drawSlingshot()

    // One continuous elastic strip, above the fork and behind the projectile.
    this.band = this.add.graphics().setDepth(9)

    this.puff = this.matter.add.image(this.slingX,this.slingY,'puff-sheet','puff',{
      shape:{type:'circle',radius:19.5/(48/258)}, restitution:.55, friction:.008, density:.003
    }).setScale(48/258).setDepth(10).setStatic(true)
    clipArtwork(this,this.puff,'puff')
    this.puff.setInteractive({useHandCursor:true})

    this.input.on('pointerdown', p => {
      if(this.phase !== 'ready') return
      if(shots.value >= maxShots) return
      const d = Phaser.Math.Distance.Between(p.x,p.y,this.puff.x,this.puff.y)
      if(d >= 65) return
      this.dragging=true
      this.phase='dragging'
      this.dragPointer=p.id
      this.dragOffset={x:this.puff.x-p.x,y:this.puff.y-p.y}
      this.dragTarget={x:this.puff.x,y:this.puff.y}
    })
    this.input.on('pointermove', p => this.setDragTarget(p))
    const release = p => {
      if(p.id !== this.dragPointer) return
      this.setDragTarget(p)
      this.releasePuff()
    }
    this.input.on('pointerup',release)
    this.input.on('pointerupoutside',release)
    const cancelDrag=()=>{
      if(this.phase==='dragging') this.returnToRest()
    }
    this.game.events.on('blur',cancelDrag)
    this.events.once('shutdown',()=>this.game.events.off('blur',cancelDrag))

    // Floor physics body aligned with visible ground.
    this.matter.add.rectangle(W/2,this.groundY+34,W,68,{isStatic:true,label:'floor'})

    this.createCupMountain()

    const onCollision = ev => {
      ev.pairs.forEach(pair => {
        const a=pair.bodyA.gameObject, b=pair.bodyB.gameObject
        if(!a || !b) return
        if(!this.launched) return
        const speed = Math.hypot(
          pair.bodyA.velocity.x - pair.bodyB.velocity.x,
          pair.bodyA.velocity.y - pair.bodyB.velocity.y
        )
        if(speed > 2.1){
          for(const obj of [a,b]){
            if(obj.getData?.('cup') && !obj.getData('scored')) this.breakCup(obj)
          }
        }
      })
    }
    this.matter.world.on('collisionstart', onCollision)

    this.time.addEvent({delay:700,loop:true,callback:()=>{
      const elapsed = this.time.now - this.launchedAt
      if(this.launched && (this.puff.x < -150 || this.puff.x>W+150 || this.puff.y>H+100 ||
        elapsed > 8000 || (elapsed > 1000 && this.puff.body.speed < .5))){
        this.resetPuff()
      }
    }})

    this.updateBand()
  }

  createCupMountain(){
    const W=this.scale.width
    this.cups=[]
    // 80 physical cups. 100 points each = exactly 8,000 maximum.
    const rows = [12,12,11,11,10,9,8,7]
    const cupHeight=44
    const spacing=276*(cupHeight/419)+1
    let prevRowCups=[]
    rows.forEach((count,row) => {
      const baseX=W-330
      const y=this.groundY-cupHeight/2-row*cupHeight
      const startX=baseX-(count-1)*spacing/2
      const rowCups=[]
      for(let i=0;i<count;i++){
        const cup=this.matter.add.image(startX+i*spacing,y,'cup-sheet','cup',{
          // Wake only when an impact reaches the stack.
          isSleeping:true, restitution:.25, friction:.65, density:.004
        }).setScale(cupHeight/419).setDepth(5)
        clipArtwork(this,cup,'cup')
        cup.setData('cup',true)
        cup.setData('scored',false)
        cup.setData('onGround',row===0)
        // Remember exactly which cups this one was placed on, so we know
        // precisely when it loses support instead of guessing from position.
        cup.setData('supporters',prevRowCups.filter(other => Math.abs(other.x-cup.x)<spacing*.9))
        this.cups.push(cup)
        rowCups.push(cup)
      }
      prevRowCups=rowCups
    })
  }

  setDragTarget(pointer){
    if(this.phase!=='dragging' || pointer.id!==this.dragPointer) return
    let dx=Math.min(0,pointer.x+this.dragOffset.x-this.slingX)
    let dy=pointer.y+this.dragOffset.y-this.slingY
    const length=Math.hypot(dx,dy)
    if(length>this.maxPull){dx*=this.maxPull/length;dy*=this.maxPull/length}
    this.dragTarget={x:this.slingX+dx,y:this.slingY+dy}
  }

  returnToRest(){
    this.dragging=false
    this.phase='returning'
    this.releaseMotion={x:this.puff.x,y:this.puff.y,angle:this.puff.rotation,elapsed:0}
  }

  releasePuff(){
    if(this.phase!=='dragging') return
    this.dragging=false
    const dx=this.slingX-this.puff.x, dy=this.slingY-this.puff.y
    if(Math.hypot(dx,dy)<12){this.returnToRest();return}
    // Puff and bands accelerate together to the fork before physics takes over.
    this.phase='releasing'
    this.releaseMotion={x:this.puff.x,y:this.puff.y,angle:this.puff.rotation,dx,dy,elapsed:0}
    this.sound.play('yipee')
    shots.value++
    this.updateScoreboard()
    message.value='Curry puff away! Hit the kopi cup mountain!'
    this.updateMessage()
  }

  updateScoreboard(){
    this.scoreText.setText(`SCORE: ${score.value.toLocaleString()} / 8,000`)
    this.shotsText.setText(`SHOTS: ${shots.value} / ${maxShots}`)
  }

  updateMessage(){
    this.messageText.setText(message.value)
  }

  drawRestartButton(){
    const x=16,y=16,w=118,h=36
    const bg=this.add.graphics().setDepth(20)
    bg.fillStyle(0xfff7e8,0.95).fillRoundedRect(x,y,w,h,10)
    bg.lineStyle(3,0x7d2d17,1).strokeRoundedRect(x,y,w,h,10)
    bg.setInteractive(new Phaser.Geom.Rectangle(x,y,w,h),Phaser.Geom.Rectangle.Contains)
    bg.input.cursor='pointer'
    bg.on('pointerdown',()=>restart())
    this.add.text(x+w/2,y+h/2,'RESTART',{
      fontFamily:'Arial Black, Arial',fontSize:'14px',color:'#7d2d17'
    }).setOrigin(.5).setDepth(21)
  }

  updateSlingshot(delta){
    const dt=Math.min(delta,50)
    if(this.phase==='dragging'){
      const follow=1-Math.exp(-dt/24)
      this.puff.setPosition(
        Phaser.Math.Linear(this.puff.x,this.dragTarget.x,follow),
        Phaser.Math.Linear(this.puff.y,this.dragTarget.y,follow)
      )
      const tilt=(this.puff.y-this.slingY)/this.maxPull*-.18
      this.puff.setRotation(Phaser.Math.Linear(this.puff.rotation,tilt,follow))
    } else if(this.phase==='releasing' || this.phase==='returning'){
      const motion=this.releaseMotion
      motion.elapsed+=dt
      const returning=this.phase==='returning'
      const t=Math.min(1,motion.elapsed/(returning ? 180 : 150))
      const ease=returning ? 1-(1-t)**3 : t*t
      this.puff.setPosition(
        Phaser.Math.Linear(motion.x,this.slingX,ease),
        Phaser.Math.Linear(motion.y,this.slingY,ease)
      ).setRotation(motion.angle*(1-ease))
      if(t===1){
        if(returning){this.phase='ready'}
        else {
          this.phase='flying'
          this.launched=true
          this.launchedAt=this.time.now
          this.recoil={dx:motion.dx,dy:motion.dy,elapsed:0}
          this.puff.setStatic(false).setAwake()
          this.puff.setVelocity(motion.dx*.22,motion.dy*.22)
          this.puff.setAngularVelocity(.025)
        }
      }
    }
    if(this.phase==='flying'){
      this.recoil.elapsed+=dt
      const t=Math.min(1,this.recoil.elapsed/420)
      const spring=Math.sin(t*Math.PI*3)*(1-t)**3*.12
      this.bandEnd.x=this.slingX+this.recoil.dx*spring
      this.bandEnd.y=this.slingY+this.recoil.dy*spring
    }
  }

  breakCup(cup){
    if(cup.getData('scored')) return
    cup.setData('scored',true)
    score.value=Math.min(8000,score.value+100)
    this.updateScoreboard()

    const x=cup.x,y=cup.y
    this.cups=this.cups.filter(c => c!==cup)

    // Coffee splash + shards.
    const g=this.add.graphics().setDepth(15)
    g.fillStyle(0x8b4a24,.85)
    for(let i=0;i<7;i++){
      const ang=Math.random()*Math.PI*2, dist=10+Math.random()*35
      g.fillCircle(x+Math.cos(ang)*dist,y+Math.sin(ang)*dist,2+Math.random()*5)
    }
    this.tweens.add({targets:g,alpha:0,duration:650,onComplete:()=>g.destroy()})

    this.tweens.add({
      targets:cup,alpha:0,scaleX:cup.scaleX*1.35,scaleY:cup.scaleY*.55,
      duration:180,onComplete:()=>cup.destroy()
    })

    if(score.value>=8000){
      message.value='🏆 8,000 CUPS! WORLD RECORD CELEBRATION!'
      this.celebrate()
      won.value=true
      setTimeout(()=>{showEndScreen.value=true},1400)
    } else {
      message.value=`${score.value.toLocaleString()} / 8,000 cups! Keep going!`
    }
    this.updateMessage()
  }

  celebrate(){
    const W=this.scale.width
    const title=this.add.text(W/2,150,'8,000!',{
      fontFamily:'Arial Black',fontSize:'76px',color:'#ffd34e',
      stroke:'#8d2b16',strokeThickness:10
    }).setOrigin(.5).setDepth(50).setScale(.2)
    this.tweens.add({targets:title,scale:1,duration:550,ease:'Back.Out'})
    for(let i=0;i<70;i++){
      const p=this.add.rectangle(Math.random()*W,-20,7,15,
        Phaser.Display.Color.RandomRGB(70,255).color).setDepth(49)
      this.tweens.add({targets:p,y:this.scale.height+40,x:p.x+Phaser.Math.Between(-120,120),
        angle:Phaser.Math.Between(-360,360),duration:1800+Math.random()*1600,delay:Math.random()*500,
        onComplete:()=>p.destroy()})
    }
  }

  resetPuff(){
    if(score.value>=8000) return
    this.launched=false
    this.dragging=false
    this.phase='ready'
    this.releaseMotion=null
    this.recoil=null
    this.bandEnd.x=this.slingX
    this.bandEnd.y=this.slingY
    if(this.puff?.body){
      this.puff.setStatic(true)
      this.puff.setVelocity(0,0)
      this.puff.setAngularVelocity(0)
      this.puff.setRotation(0)
      this.puff.setPosition(this.slingX,this.slingY)
    }
    if(shots.value >= maxShots){
      message.value = `Out of shots! ${score.value.toLocaleString()} / 8,000 cups. Restart to try again.`
      won.value = false
      showEndScreen.value = true
    } else {
      message.value = 'Pull the curry puff backwards and release!'
    }
    this.updateMessage()
  }

  drawSlingshot(){
    const forkScale=.87
    const forkY=this.groundY-4
    this.sling=clipArtwork(this,this.add.image(this.slingX,forkY,'sling-sheet','fork')
      .setOrigin(.5,1).setScale(forkScale).setDepth(8),'fork')
    // These coordinates match the branch tips in the supplied sheet.
    this.forkLeft={x:this.slingX+(599-644)*forkScale,y:forkY+(539-687)*forkScale}
    this.forkRight={x:this.slingX+(693-644)*forkScale,y:forkY+(535-687)*forkScale}
    for(const anchor of [this.forkLeft,this.forkRight]){
      clipArtwork(this,this.add.image(anchor.x,anchor.y,'sling-sheet','wrap')
        .setScale(.285).setDepth(9),'wrap')
    }
    clipArtwork(this,this.add.image(this.slingX,this.groundY+2,'sling-sheet','base')
      .setOrigin(.5,1).setScale(.345).setDepth(12),'base')
  }

  updateBand(){
    this.band.clear()
    const end=this.launched ? this.bandEnd : this.puff
    const tilt=this.launched ? 0 : this.puff.rotation
    // Both sides meet at one point behind the puff, including during recoil.
    const sin=Math.sin(tilt),cos=Math.cos(tilt)
    const local=(x,y)=>({x:end.x+x*cos-y*sin,y:end.y+x*sin+y*cos})
    const joint=local(0,14)
    const tension=Math.min(1,Math.hypot(end.x-this.slingX,end.y-this.slingY)/this.maxPull)
    const sag=6*(1-tension)
    const curvePoints=(anchor,tip)=>{
      const curve=new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(anchor.x,anchor.y),
        new Phaser.Math.Vector2((anchor.x+tip.x)/2,(anchor.y+tip.y)/2+sag),
        new Phaser.Math.Vector2(tip.x,tip.y)
      )
      return curve.getPoints(12)
    }
    // Stroke the entire fork-to-fork path at once; there are no loose ends.
    this.bandPoints=[
      ...curvePoints(this.forkLeft,joint),
      ...curvePoints(joint,this.forkRight).slice(1)
    ]
    this.band.lineStyle(6-tension*1.5,0x65251c,1).strokePoints(this.bandPoints)
    this.band.lineStyle(3.75-tension*.75,0xdb513a,1).strokePoints(this.bandPoints)
  }

  checkFloatingCups(){
    // A cup loses support once every cup it was originally placed on is
    // destroyed; wake it so gravity pulls it down instead of it hanging in place.
    for(const cup of this.cups){
      if(cup.getData('scored') || !cup.body.isSleeping || cup.getData('onGround')) continue
      // A destroyed supporter's DataManager is gone too, so 'scored' alone
      // can't be trusted once destroy() has actually run; active covers that.
      // A supporter that's awake has itself lost its footing and is falling,
      // so it can no longer be trusted to hold anything up either.
      const supported=cup.getData('supporters').some(s => s.active && !s.getData('scored') && s.body.isSleeping)
      if(!supported) cup.setAwake()
    }
  }

  update(time,delta){
    this.updateSlingshot(delta)
    this.updateBand()
    this.checkFloatingCups()
  }

}

function startGame(){
  // Width stays the standard 1200 design reference so every element's
  // position (slingshot, cup mountain, HUD) keeps the same relative layout
  // on every device. Height only grows beyond the base 650 when the device
  // is proportionally taller than that — the extra room is just more open
  // sky above the action (the scene already extends the flat sky colour to
  // fill H, see below), not a stretched or cropped layout. FIT then scales
  // that design to fit the device with no overflow in either dimension.
  const designWidth = 1500
  const baseHeight = 800
  const deviceAspect = window.innerHeight / window.innerWidth
  const designHeight = Math.max(baseHeight, Math.round(designWidth * deviceAspect))

  // Cap at the background art's native resolution (2172px wide) so the
  // scene is never stretched past its source pixels and turns soft.
  const maxWidth = 2172
  const maxHeight = Math.round(maxWidth * (designHeight / designWidth))

  game = new Phaser.Game({
    type:Phaser.AUTO,
    parent:gameHost.value,
    width:designWidth,height:baseHeight,
    backgroundColor:'#7bd2f5',
    physics:{default:'matter',matter:{gravity:{y:1.05},enableSleeping:true,debug:false}},
    scale:{
      mode:Phaser.Scale.FIT,
      autoCenter:Phaser.Scale.CENTER_BOTH,
      max:{width:maxWidth,height:maxHeight}
    },
    scene:[GameScene]
  })
}

function restart(){
  score.value=0; shots.value=0; message.value='Pull the curry puff backwards and release!'
  showEndScreen.value=false; won.value=false
  game?.scene?.getScene('GameScene')?.scene.restart()
}

onMounted(startGame)
onBeforeUnmount(()=>game?.destroy(true))
</script>

<template>
  <main class="stage">
    <div ref="gameHost" class="game"></div>

    <div v-if="showEndScreen" class="end-overlay">
      <div class="end-card">
        <h2>{{ won ? '🏆 World Record!' : 'Out of Shots!' }}</h2>
        <p class="end-score">{{ score.toLocaleString() }} <span>/ 8,000 cups</span></p>
        <p class="end-sub">{{ won ? 'You smashed the full 8,000-cup mountain!' : `You used all ${maxShots} shots.` }}</p>
        <button @click="restart">Play Again</button>
      </div>
    </div>
  </main>
</template>
