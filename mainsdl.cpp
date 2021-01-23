/*!
 * @file        mainsdl.cpp
 * @author      mithrendal and Dirk W. Hoffmann, www.dirkwhoffmann.de
 * @copyright   Dirk W. Hoffmann. All rights reserved.
 */

#include <stdio.h>
#include "C64.h"
#include "C64Types.h"
#include "msg_codes.h"

#include <emscripten.h>
#include <SDL2/SDL.h>
#include <emscripten/html5.h>

/* SDL2 start*/
SDL_Window * window = NULL;
SDL_Surface * window_surface = NULL;
unsigned int * pixels;

SDL_Renderer * renderer = NULL;
SDL_Texture * screen_texture = NULL;

/* SDL2 end */

void PrintEvent(const SDL_Event * event)
{
    if (event->type == SDL_WINDOWEVENT) {
        switch (event->window.event) {
        case SDL_WINDOWEVENT_SHOWN:
            printf("Window %d shown", event->window.windowID);
            break;
        case SDL_WINDOWEVENT_HIDDEN:
            printf("Window %d hidden", event->window.windowID);
            break;
        case SDL_WINDOWEVENT_EXPOSED:
            printf("Window %d exposed", event->window.windowID);
            break;
        case SDL_WINDOWEVENT_MOVED:
            printf("Window %d moved to %d,%d",
                    event->window.windowID, event->window.data1,
                    event->window.data2);
            break;
        case SDL_WINDOWEVENT_RESIZED:
            printf("Window %d resized to %dx%d",
                    event->window.windowID, event->window.data1,
                    event->window.data2);
            break;
        case SDL_WINDOWEVENT_SIZE_CHANGED:
            printf("Window %d size changed to %dx%d",
                    event->window.windowID, event->window.data1,
                    event->window.data2);
            break;
        case SDL_WINDOWEVENT_MINIMIZED:
            printf("Window %d minimized", event->window.windowID);
            break;
        case SDL_WINDOWEVENT_MAXIMIZED:
            printf("Window %d maximized", event->window.windowID);
            break;
        case SDL_WINDOWEVENT_RESTORED:
            printf("Window %d restored", event->window.windowID);
            break;
        case SDL_WINDOWEVENT_ENTER:
            printf("Mouse entered window %d",
                    event->window.windowID);
            break;
        case SDL_WINDOWEVENT_LEAVE:
            printf("Mouse left window %d", event->window.windowID);
            break;
        case SDL_WINDOWEVENT_FOCUS_GAINED:
            printf("Window %d gained keyboard focus",
                    event->window.windowID);
            break;
        case SDL_WINDOWEVENT_FOCUS_LOST:
            printf("Window %d lost keyboard focus",
                    event->window.windowID);
            break;
        case SDL_WINDOWEVENT_CLOSE:
            printf("Window %d closed", event->window.windowID);
            break;
#if SDL_VERSION_ATLEAST(2, 0, 5)
        case SDL_WINDOWEVENT_TAKE_FOCUS:
            printf("Window %d is offered a focus", event->window.windowID);
            break;
        case SDL_WINDOWEVENT_HIT_TEST:
            printf("Window %d has a special hit test", event->window.windowID);
            break;
#endif
        default:
            printf("Window %d got unknown event %d",
                    event->window.windowID, event->window.event);
            break;
        }
        printf("\n");
    }
}

int emu_width  = TEX_WIDTH; //NTSC_PIXELS; //428
int emu_height = TEX_HEIGHT; //PAL_RASTERLINES; //284
int eat_border_width = 0;
int eat_border_height = 0;
int xOff = 12 + eat_border_width;
int yOff = 12 + eat_border_height;
int clipped_width  = TEX_WIDTH -12 -24 -2*eat_border_width; //392
int clipped_height = TEX_HEIGHT -12 -24 -2*eat_border_height; //248

int bFullscreen = false;


EM_BOOL emscripten_window_resized_callback(int eventType, const void *reserved, void *userData){
/*
	double width, height;
	emscripten_get_element_css_size("canvas", &width, &height);
	int w = (int)width, h = (int)height;
*/
  // resize SDL window
    SDL_SetWindowSize(window, clipped_width, clipped_height);
    /*
    SDL_Rect SrcR;
    SrcR.x = 0;
    SrcR.y = 0;
    SrcR.w = emu_width;
    SrcR.h = emu_height;
    SDL_RenderSetViewport(renderer, &SrcR);
    */
	return true;
}

char *filename = NULL;

extern "C" void wasm_toggleFullscreen()
{
    if(!bFullscreen)
    {
      bFullscreen=true;

      EmscriptenFullscreenStrategy strategy;
      strategy.scaleMode = EMSCRIPTEN_FULLSCREEN_CANVAS_SCALE_STDDEF;
      strategy.filteringMode = EMSCRIPTEN_FULLSCREEN_FILTERING_DEFAULT;
      strategy.canvasResizedCallback = emscripten_window_resized_callback;
      emscripten_enter_soft_fullscreen("canvas", &strategy);    
    }
    else
    {
      bFullscreen=false;
      emscripten_exit_soft_fullscreen(); 
    }
}

int eventFilter(void* thisC64, SDL_Event* event) {
    C64 *c64 = (C64 *)thisC64;
    switch(event->type){
      case SDL_WINDOWEVENT:
        //PrintEvent(event);
        if (event->window.event == SDL_WINDOWEVENT_SIZE_CHANGED)
        {//zuerst
            window_surface = SDL_GetWindowSurface(window);
            pixels = (unsigned int *)window_surface->pixels;
            int width = window_surface->w;
            int height = window_surface->h;
            printf("Size changed: %d, %d\n", width, height);  
        }
        else if(event->window.event==SDL_WINDOWEVENT_RESIZED)
        {//this event comes after SDL_WINDOWEVENT_SIZE_CHANGED
              //SDL_SetWindowSize(window, emu_width, emu_height);   
              //SDL_SetWindowPosition(window, SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED);
              //window_surface = SDL_GetWindowSurface(window);
        }
        break;
      case SDL_KEYDOWN:
        if ( event->key.keysym.sym == SDLK_RETURN &&
             event->key.keysym.mod & KMOD_ALT )
        {
            wasm_toggleFullscreen();
        }
        break;
      case SDL_FINGERDOWN:
      case SDL_MOUSEBUTTONDOWN:
        /* on some browsers (chrome, safari) we have to resume Audio on users action 
           https://developers.google.com/web/updates/2017/09/autoplay-policy-changes
        */
        EM_ASM({
            if (typeof Module === 'undefined'
                || typeof Module.SDL2 == 'undefined'
                || typeof Module.SDL2.audioContext == 'undefined')
                return;
            if (Module.SDL2.audioContext.state == 'suspended') {
                Module.SDL2.audioContext.resume();
            }
        });
        break;
        default:
          //printf("unhandeld event %d",event->type);
          break;
    }
    return 1;
}

 
int sum_samples=0;
double last_time = 0.0 ;
unsigned int executed_frame_count=0;
int64_t total_executed_frame_count=0;
double start_time=emscripten_get_now();
unsigned int rendered_frame_count=0;
unsigned int frames=0, seconds=0;
// The emscripten "main loop" replacement function.
void draw_one_frame_into_SDL(void *thisC64) 
{
  //this method is triggered by
  //emscripten_set_main_loop_arg(em_arg_callback_func func, void *arg, int fps, int simulate_infinite_loop) 
  //which is called inside te c64.cpp
  //fps Setting int <=0 (recommended) uses the browser’s requestAnimationFrame mechanism to call the function.

  //The number of callbacks is usually 60 times per second, but will 
  //generally match the display refresh rate in most web browsers as 
  //per W3C recommendation. requestAnimationFrame() 
  
  double now = emscripten_get_now();  
 
  double elapsedTimeInSeconds = (now - start_time)/1000.0;
  int64_t targetFrameCount = (int64_t)(elapsedTimeInSeconds * 50.125);
 
  int max_gap = 8;


  C64 *c64 = (C64 *)thisC64;

  if(c64->inWarpMode() == true)
  {
    printf("warping at least 25 frames at once ...\n");
    int i=25;
    while(c64->inWarpMode() == true && i>0)
    {
      c64->executeOneFrame();
      i--;
    }
    start_time=now;
    total_executed_frame_count=0;
    targetFrameCount=1;  
  }

  //lost the sync
  if(targetFrameCount-total_executed_frame_count > max_gap)
  {
      printf("lost sync target=%lld, total_executed=%lld\n", targetFrameCount, total_executed_frame_count);
      //reset timer
      //because we are out of sync, we do now skip max_gap-1 emulation frames 
      start_time=now;
      total_executed_frame_count=0;
      targetFrameCount=1;  //we are hoplessly behind but do at least one in this round  
  }

  if(now-last_time>= 1000.0)
  { 
    double passed_time= now - last_time;
    last_time = now;

    seconds += 1; 
    frames += rendered_frame_count;
    printf("time[ms]=%.0lf, audio_samples=%d, frames [executed=%u, rendered=%u] avg_fps=%u\n", 
    passed_time, sum_samples, executed_frame_count, rendered_frame_count, frames/seconds);
    sum_samples=0; 
    rendered_frame_count=0;
    executed_frame_count=0;
  }

  while(total_executed_frame_count < targetFrameCount) {
    executed_frame_count++;
    total_executed_frame_count++;

    c64->executeOneFrame();
  }

  rendered_frame_count++;  

  EM_ASM({
 //     if (typeof draw_one_frame === 'undefined')
 //         return;
      draw_one_frame(); // to gather joystick information for example 
  });
 
  Uint8 *texture = (Uint8 *)c64->vic.stableEmuTexture(); //screenBuffer();

  int surface_width = window_surface->w;
  int surface_height = window_surface->h;

//  SDL_RenderClear(renderer);
  SDL_Rect SrcR;
  SrcR.x = xOff;
  SrcR.y = yOff;
  SrcR.w = clipped_width;
  SrcR.h = clipped_height;
  SDL_UpdateTexture(screen_texture, &SrcR, texture+ (4*emu_width*SrcR.y) + SrcR.x*4, 4*emu_width);

  SDL_RenderCopy(renderer, screen_texture, &SrcR, NULL);

  SDL_RenderPresent(renderer);
}



void MyAudioCallback(void*  thisC64,
                       Uint8* stream,
                       int    len)
{
    C64 *c64 = (C64 *)thisC64;
    
    int n = len /  sizeof(float);
    c64->sid.copyMono((float *)stream, n);
/*    printf("copyMono[%d]: ", n);
    for(int i=0; i<n; i++)
    {
      printf("%hhu,",stream[i]);
    }
    printf("\n");
  */  
    sum_samples += n;
}


extern "C" void wasm_create_renderer(char* name)
{ 
  printf("try to create %s renderer\n", name);
  window = SDL_CreateWindow("",
   SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED,
        clipped_width, clipped_height,
        SDL_WINDOW_RESIZABLE);

  if(0==strcmp("webgl", name))
  {
    renderer = SDL_CreateRenderer(window,
          -1, 
          SDL_RENDERER_PRESENTVSYNC|SDL_RENDERER_ACCELERATED);
    if(renderer == NULL)
    {
      printf("can not get hardware accelerated renderer going with software renderer instead...\n");
    }
    else
    {
      printf("got hardware accelerated renderer ...\n");
    }
  }
  if(renderer == NULL)
  {
      renderer = SDL_CreateRenderer(window,
          -1, 
          SDL_RENDERER_SOFTWARE
          );

    if(renderer == NULL)
    {
      printf("can not get software renderer ...\n");
      return;
    }
    else
    {
      printf("got software renderer ...\n");
    }
  }

    // Since we are going to display a low resolution buffer,
    // it is best to limit the window size so that it cannot
    // be smaller than our internal buffer size.
  SDL_SetWindowMinimumSize(window, clipped_width, clipped_height);
  SDL_RenderSetLogicalSize(renderer, clipped_width, clipped_height); 
  SDL_RenderSetIntegerScale(renderer, SDL_TRUE);

  screen_texture = SDL_CreateTexture(renderer,
        SDL_PIXELFORMAT_ABGR8888
        , SDL_TEXTUREACCESS_STREAMING,
        emu_width, emu_height);

  window_surface = SDL_GetWindowSurface(window);
}

void initSDL(void *thisC64)
{
    C64 *c64 = (C64 *)thisC64;

    if(SDL_Init(SDL_INIT_VIDEO|SDL_INIT_AUDIO)==-1)
    {
        printf("Could not initialize SDL:%s\n", SDL_GetError());
    } 

    SDL_AudioSpec want, have;
    SDL_AudioDeviceID device_id;

    SDL_memset(&want, 0, sizeof(want)); /* or SDL_zero(want) */
    want.freq = 44100;  //44100; // 22050;
    want.format = AUDIO_F32;
    want.channels = 1;
    //sample buffer 512 in original vc64, vc64web=512 under macOs ok, but iOS needs 2048;
    want.samples = 2048;
    want.callback = MyAudioCallback;
    want.userdata = thisC64;   //will be passed to the callback
    device_id = SDL_OpenAudioDevice(NULL, 0, &want, &have, SDL_AUDIO_ALLOW_FORMAT_CHANGE);
    if(device_id == 0)
    {
        printf("Failed to open audio: %s\n", SDL_GetError());
    }

    printf("set SID to freq= %d\n", have.freq);
    c64->sid.setSampleRate(have.freq);
    printf("freq in SIDBridge= %f\n", c64->sid.getSampleRate());
 

    SDL_PauseAudioDevice(device_id, 0); //unpause the audio device
    
    //listen to mouse, finger and keys
    SDL_SetEventFilter(eventFilter, thisC64);

//  wasm_create_renderer((char*)"webgl");
}


void send_message_to_js(const char * msg)
{
    EM_ASM(
    {
        if (typeof message_handler === 'undefined')
            return;
        message_handler( "MSG_"+UTF8ToString($0) );
    }, msg );    

}


bool warp_mode=false;
void theListener(const void * c64, long type, long data){
  
  if(warp_mode && type == MSG_IEC_BUS_BUSY && !((C64 *)c64)->inWarpMode())
  {
      ((C64 *)c64)->setWarp(true);
  }
  else if(type == MSG_IEC_BUS_IDLE && ((C64 *)c64)->inWarpMode())
  {
      ((C64 *)c64)->setWarp(false);
  }


  if(0!=strcmp("MSG_CHARSET", msg_code[type].c_str()))
  {

    const char *message_as_string =  (const char *)MsgTypeEnum::key((MsgType)type);
    printf("vC64 message=%s, data=%ld\n", 
    message_as_string
    //msg_code[type].c_str()
    , data);

    send_message_to_js(
      message_as_string
      //msg_code[type]
      );
/*    EM_ASM({
        if (typeof message_handler === 'undefined')
            return;
        message_handler( $0 );}, msg_code[type].c_str() );    
*/
  }

}



class C64Wrapper {
  public:
    C64 *c64;

  C64Wrapper()
  {
    printf("constructing C64 ...\n");

    this->c64 = new C64();

    printf("adding a listener to C64 message queue...\n");

    c64->addListener(this->c64, &theListener);

  }
  ~C64Wrapper()
  {
        printf("closing wrapper");
  }

  void run()
  {
/*    printf("wrapper calls 4x c64->loadRom(...) method\n");
    c64->loadRom(ROM_KERNAL ,"roms/kernal.901227-03.bin");
    c64->loadRom(ROM_BASIC, "roms/basic.901226-01.bin");
    c64->loadRom(ROM_CHAR, "roms/characters.901225-01.bin");
    c64->loadRom(ROM_VC1541, "roms/1541-II.251968-03.bin");
*/
    if(!c64->isReady())
    {
      c64->putMessage(MSG_ROM_MISSING);
    }
    /*
    EM_ASM({
      setTimeout(function() {message_handler( $0 );}, 0);
    }, msg_code[MSG_ROM_MISSING].c_str() );
*/

    printf("v4 wrapper calls run on c64->run() method\n");

    //c64->setTakeAutoSnapshots(false);
    //c64->setWarpLoad(true);
    c64->configure(OPT_GRAY_DOT_BUG, false);
    c64->configure(OPT_VIC_REVISION, VICREV_PAL_6569_R1);

    c64->configure(OPT_SID_ENGINE, SIDENGINE_RESID);
//    c64->configure(OPT_SID_SAMPLING, SID_SAMPLE_INTERPOLATE);


    // master Volumne
    c64->configure(OPT_AUDVOLL, 100); 
    c64->configure(OPT_AUDVOLR, 100);

    //SID0 Volumne
    c64->configure(OPT_AUDVOL, 0, 100); 
    c64->configure(OPT_AUDPAN, 0, 0);

    //SID1 Volumne
/*    c64->configure(OPT_AUDVOL, 1, 100);
    c64->configure(OPT_AUDPAN, 1, 50);
    c64->configure(OPT_SID_ENABLE, 1, true);
    c64->configure(OPT_SID_ADDRESS, 1, 0xd420);
*/


    //c64->configure(OPT_HIDE_SPRITES, true); 
    c64->dump();
//    printf("is running = %u\n",c64->isRunning()); 
 //   c64->dump();
 //   c64->drive1.dump();
    //c64->setDebugLevel(2);also 
    //c64->sid.setDebugLevel(4);
 //   c64->drive1.setDebugLevel(3);
 //   c64->sid.dump();

    printf("waiting on emulator ready in javascript ...\n");
 
  }
};

C64Wrapper *wrapper = NULL;
extern "C" int main(int argc, char** argv) {
  wrapper= new C64Wrapper();
 
  initSDL(wrapper->c64);
  wrapper->run();
  return 0;
}

/* emulation of macos mach_absolute_time() function. */
uint64_t mach_absolute_time()
{
    uint64_t nano_now = (uint64_t)(emscripten_get_now()*1000000.0);
    //printf("emsdk_now: %lld\n", nano_now);
    return nano_now; 
}

extern "C" void wasm_key(int code1, int code2, int pressed)
{
  printf("wasm_key ( %d, %d, %d ) \n", code1, code2, pressed);

  if(code1 == 9 && code2 == 9)
  {
    if(pressed == 1)
    {
      wrapper->c64->keyboard.pressRestore();
    }
    else
    {
      wrapper->c64->keyboard.releaseRestore();
    }
  }
  else if(pressed==1)
  {
    wrapper->c64->keyboard.pressRowCol(code1, code2);
  }
  else
  {
    wrapper->c64->keyboard.releaseRowCol(code1, code2);
  }
}

extern "C" void wasm_schedule_key(int code1, int code2, int pressed, int frame_delay)
{
  if(code1 == 9 && code2 == 9)
  {
    if(pressed == 1)
    {
      wrapper->c64->keyboard.scheduleKeyPress(31, frame_delay);   //pressRestore();
    }
    else
    {
      wrapper->c64->keyboard.scheduleKeyRelease(31, frame_delay);   //releaseRestore();
    }
  }
  else if(pressed==1)
  {
    printf("scheduleKeyPress ( %d, %d, %d ) \n", code1, code2, frame_delay);

    wrapper->c64->keyboard.scheduleKeyPress(code1, code2, frame_delay);
  }
  else
  {

    printf("scheduleKeyRelease ( %d, %d, %d ) \n", code1, code2, frame_delay);

    wrapper->c64->keyboard.scheduleKeyRelease(code1, code2, frame_delay);
  }
}




char wasm_pull_user_snapshot_file_json_result[255];
//extern "C" Uint8 *wasm_pull_user_snapshot_file()
extern "C" char* wasm_pull_user_snapshot_file()
{
  printf("wasm_pull_user_snapshot_file\n");

  Snapshot *snapshot = wrapper->c64->latestUserSnapshot(); //wrapper->c64->userSnapshot(nr);

  size_t size = snapshot->size; //writeToBuffer(NULL);
  uint8_t *buffer = new uint8_t[size];
  snapshot->writeToBuffer(buffer);
  for(int i=0; i < 30; i++)
  {
    printf("%d",buffer[i]);
  }
  printf("\n");
  sprintf(wasm_pull_user_snapshot_file_json_result, "{\"address\":%lu, \"size\": %lu, \"width\": %u, \"height\":%u }",
  (unsigned long)buffer, 
  size,
  snapshot->header()->screenshot.width,
  snapshot->header()->screenshot.height
  );
  printf("return => %s\n",wasm_pull_user_snapshot_file_json_result);
  return wasm_pull_user_snapshot_file_json_result;
}

extern "C" void wasm_take_user_snapshot()
{
  wrapper->c64->requestUserSnapshot();
}

extern "C" void wasm_set_warp(unsigned on)
{
  warp_mode = (on == 1);

  if(wrapper->c64->iec.isTransferring() && 
      (
        (wrapper->c64->inWarpMode() && warp_mode == false)
        ||
        (wrapper->c64->inWarpMode() == false && warp_mode)
      )
  )
  {
      wrapper->c64->setWarp(warp_mode);
  }
}


extern "C" void wasm_set_borderless(unsigned on)
{
  //NTSC_PIXEL=428
  //PAL_RASTERLINES=284 

  eat_border_width = on*(35 /* v4 */ -4);
  xOff = 12 + eat_border_width /*v4*/ +92;
  clipped_width  = TEX_WIDTH -12 -24 -2*eat_border_width /*v4*/ -100; //392
//428-12-24-2*33 =326

  eat_border_height = on*(24 /*v4*/ + 10);
  yOff = 10 + eat_border_height /*v4*/ +5;
  clipped_height = TEX_HEIGHT -10 -24 -2*eat_border_height  /*v4*/ -8; //248
//284-11-24-2*22=205
 
  SDL_SetWindowMinimumSize(window, clipped_width, clipped_height);
  SDL_RenderSetLogicalSize(renderer, clipped_width, clipped_height); 
  SDL_SetWindowSize(window, clipped_width, clipped_height);

}

extern "C" const char* wasm_loadFile(char* name, Uint8 *blob, long len)
{
  printf("load file=%s len=%ld, header bytes= %x, %x, %x\n", name, len, blob[0],blob[1],blob[2]);
  filename=name;
  auto file_suffix= suffix(name); 
  if(wrapper == NULL)
  {
    return "";
  }
  if (D64File::isCompatibleName(filename)) {
    printf("isD64\n");
    FSDevice *fs= FSDevice::makeWithD64(*D64File::make<D64File>(blob, len)); 
    wrapper->c64->drive8.insertFileSystem(fs);
  }
  else if (G64File::isCompatibleName(filename)) {
    printf("isG64\n");
    wrapper->c64->drive8.insertDisk(Disk::makeWithG64(*(wrapper->c64), G64File::make<G64File>(blob, len)));
  }
  else if (PRGFile::isCompatibleName(filename)) {
    printf("isPRG\n");
    wrapper->c64->flash(PRGFile::make<PRGFile>(blob, len),0);
  }
  else if (CRTFile::isCompatibleName(filename)) {
    printf("isCRT\n");
    wrapper->c64->expansionport.attachCartridge( Cartridge::makeWithCRTFile(*(wrapper->c64),*(CRTFile::make<CRTFile>(blob, len))));
    wrapper->c64->reset();
  }
  else if (TAPFile::isCompatibleName(filename)) {
    printf("isTAP\n");
    wrapper->c64->datasette.insertTape(TAPFile::make<TAPFile>(blob, len));
    wrapper->c64->datasette.rewind();
  //  wrapper->c64->datasette.pressPlay();
  //  wrapper->c64->datasette.pressStop();
  }
  else if (T64File::isCompatibleName(filename)) {
    printf("isT64\n");
    wrapper->c64->flash(T64File::make<T64File>(blob, len),0);
  }
  else if (Snapshot::isCompatibleName(filename)) {
    printf("isSnapshot\n");
    wrapper->c64->loadFromSnapshot(Snapshot::make<Snapshot>(blob, len));
  }
  else {
 //   printf("\n");
    //wrapper->c64->flash(RomFile::makeWithBuffer(blob, len),0);

    bool result;
    ErrorCode error;
    bool wasRunnable = wrapper->c64->isReady(&error);
    //RomFile *rom = RomFile::makeWithFile(name);
    RomFile *rom = RomFile::make<RomFile>(blob, len);

    if (!rom) {
        printf("Failed to read ROM image file %s\n", name);
        return "";
    }
    
    wrapper->c64->suspend();
    result = wrapper->c64->flash(rom);
    wrapper->c64->resume();
    
    if (result) {
        printf("Loaded ROM image %s.\n", name);
    } else {
        printf("Failed to flash ROM image %s.\n", name);
    }
    
    if (!wasRunnable && wrapper->c64->isReady(&error))
    {
       //wrapper->c64->putMessage(MSG_READY_TO_RUN);
      const char* ready_msg= "READY_TO_RUN";
      printf("sending ready message %s.\n", ready_msg);
      send_message_to_js(ready_msg);
      
    }
    
    const char *rom_type="";
    if(rom->isRomBuffer(ROM_TYPE_KERNAL, blob,len))
    {
      rom_type = "kernal_rom";
    }
    else if(rom->isRomBuffer(ROM_TYPE_VC1541, blob,len))
    {
      rom_type = "vc1541_rom";
      wrapper->c64->configure(OPT_DRIVE_CONNECT,DRIVE8,1);
    }
    else if(rom->isRomBuffer(ROM_TYPE_CHAR, blob,len))
    {
      rom_type = "char_rom";
    }
    else if(rom->isRomBuffer(ROM_TYPE_BASIC, blob,len))
    {
      rom_type = "basic_rom";
    }
    printf("detected rom_type=%s.\n", rom_type);

    delete rom;
    return rom_type;    
  }
  return "";
}


extern "C" void wasm_reset()
{
  wrapper->c64->expansionport.detachCartridge();
  wrapper->c64->reset();
}

extern "C" void wasm_halt()
{
  printf("wasm_halt\n");
  wrapper->c64->pause();
}

extern "C" void wasm_run()
{
  printf("wasm_run\n");
  wrapper->c64->run();
}


extern "C" void wasm_press_play()
{
  printf("wasm_press_play\n");
  wrapper->c64->datasette.pressPlay();
}


extern "C" void wasm_joystick(char* port_plus_event)
{
    printf("wasm_joystick event=%s\n", port_plus_event);
  /*
  from javascript
    // port, o == oben, r == rechts, ..., f == feuer
    //states = '1', '1o', '1or', '1r', '1ur', '1u', '1ul', '1l', '1ol' 
    //states mit feuer = '1f', '1of', '1orf', '1rf', '1urf', ...
  */
/*
outgoing
PULL_UP
PRESS_FIRE

RELEASE_X
RELEASE_Y
RELEASE_XY
RELEASE_FIRE
*/
  char joyport = port_plus_event[0];
  char* event  = port_plus_event+1;

  GamePadAction code;
  if( strcmp(event,"PULL_UP") == 0)
  {
    code = PULL_UP;
  }
  else if( strcmp(event,"PULL_LEFT") == 0)
  {
    code = PULL_LEFT;
  }
  else if( strcmp(event,"PULL_DOWN") == 0)
  {
    code = PULL_DOWN;
  }
  else if( strcmp(event,"PULL_RIGHT") == 0)
  {
    code = PULL_RIGHT;
  }
  else if( strcmp(event,"PRESS_FIRE") == 0)
  {
    code = PRESS_FIRE;
  }
  else if( strcmp(event,"RELEASE_XY") == 0)
  {
    code = RELEASE_XY;
  }
  else if( strcmp(event,"RELEASE_X") == 0)
  {
    code = RELEASE_X;
  }
  else if( strcmp(event,"RELEASE_Y") == 0)
  {
    code = RELEASE_Y;
  }
  else if( strcmp(event,"RELEASE_FIRE") == 0)
  {
    code = RELEASE_FIRE;
  }


  else
  {
    return;    
  }

  if(joyport == '1')
  {
    wrapper->c64->port1.joystick.trigger(code);
  }
  else if(joyport == '2')
  {
    wrapper->c64->port2.joystick.trigger(code);
  }

}

char buffer[50];
extern "C" char* wasm_sprite_info()
{
   sprintf(buffer, "%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u", 
     wrapper->c64->vic.reg.current.sprX[0],
     wrapper->c64->vic.reg.current.sprY[0],
     wrapper->c64->vic.reg.current.sprX[1],
     wrapper->c64->vic.reg.current.sprY[1],
     wrapper->c64->vic.reg.current.sprX[2],
     wrapper->c64->vic.reg.current.sprY[2],
     wrapper->c64->vic.reg.current.sprX[3],
     wrapper->c64->vic.reg.current.sprY[3],
     wrapper->c64->vic.reg.current.sprX[4],
     wrapper->c64->vic.reg.current.sprY[4],
     wrapper->c64->vic.reg.current.sprX[5],
     wrapper->c64->vic.reg.current.sprY[5],
     wrapper->c64->vic.reg.current.sprX[6],
     wrapper->c64->vic.reg.current.sprY[6],
     wrapper->c64->vic.reg.current.sprX[7],
     wrapper->c64->vic.reg.current.sprY[7]
     );  
   return buffer;
}

extern "C" void wasm_set_sid_model(unsigned SID_Model)
{
  bool wasRunning=false;
  if(wrapper->c64->isRunning()){
    wasRunning= true;
    wrapper->c64->pause();
  }
  if(SID_Model == 6581)
  {
    wrapper->c64->configure(OPT_SID_REVISION, MOS_6581);
  }
  else if(SID_Model == 8580)
  {
    wrapper->c64->configure(OPT_SID_REVISION, MOS_8580);  
  }
  if(wasRunning)
  {
    wrapper->c64->run();
  }
}

extern "C" void wasm_cut_layers(unsigned cut_layers)
{
//  wrapper->c64->configure(OPT_CUT_LAYERS, 0x100 | (SPR0|SPR1|SPR2|SPR3|SPR4|SPR5|SPR6|SPR7)); 
  wrapper->c64->configure(OPT_CUT_LAYERS, cut_layers); 
}



char json_result[255];
extern "C" const char* wasm_rom_info()
{
  sprintf(json_result, "{\"kernal\":\"%s\", \"basic\":\"%s\", \"charset\":\"%s\"}",
  wrapper->c64->hasMega65Rom(ROM_TYPE_KERNAL) ? "mega" : wrapper->c64->hasRom(ROM_TYPE_KERNAL) ? "commodore": "none", 
  wrapper->c64->hasMega65Rom(ROM_TYPE_BASIC) ? "mega" : wrapper->c64->hasRom(ROM_TYPE_BASIC) ? "commodore": "none", 
  wrapper->c64->hasMega65Rom(ROM_TYPE_CHAR) ? "mega" : wrapper->c64->hasRom(ROM_TYPE_CHAR) ? "commodore": "none"
  );
  return json_result;
}


/*
extern "C" const char* wasm_rom_classifier(Uint8 *blob, long len)
{
  const char *rom_class = "unknown";
 
   u64 _fnv = fnv_1a_64(blob, len);
  RomIdentifier _identifier = RomFile::identifier(_fnv);
  if(RomFile::isCommodoreRom(_identifier))
  {
    rom_class="commodore";
  }
  else if(RomFile::isMega65Rom(_identifier))
  {
    rom_class="mega";
  }
  printf("wasm_rom_classifier = %s, %s, %s, 0x%llx\n",
              rom_class, 
              RomFile::title(_identifier), 
              RomFile::subTitle(_identifier), 
              _fnv);
  return rom_class;
}
*/

extern "C" void wasm_set_2nd_sid(long address)
{
  if(address == 0)
  {
    wrapper->c64->configure(OPT_AUDVOL, 1, 0);
    wrapper->c64->configure(OPT_SID_ENABLE, 1, false);
  }
  else
  {
    wrapper->c64->configure(OPT_AUDVOL, 1, 100);
    wrapper->c64->configure(OPT_AUDPAN, 1, 50);
    wrapper->c64->configure(OPT_SID_ENABLE, 1, true);
    wrapper->c64->configure(OPT_SID_ADDRESS, 1, address);
  }
}


extern "C" void wasm_set_sid_engine(char* engine)
{
  printf("wasm_set_sid_engine %s\n", engine);

  bool wasRunning=false;
  if(wrapper->c64->isRunning()){
    wasRunning= true;
    wrapper->c64->pause();
  }


  if( strcmp(engine,"FastSID") == 0)
  {
    printf("c64->configure(OPT_SID_ENGINE, ENGINE_FASTSID);\n");
    wrapper->c64->configure(OPT_SID_ENGINE, SIDENGINE_FASTSID);
  }
  else if( strcmp(engine,"ReSID fast") == 0)
  { 
    printf("c64->configure(OPT_SID_SAMPLING, SID_SAMPLE_FAST);\n");
    wrapper->c64->configure(OPT_SID_ENGINE, SIDENGINE_RESID);
    wrapper->c64->configure(OPT_SID_SAMPLING, reSID::SAMPLE_FAST);
  }
  else if( strcmp(engine,"ReSID interpolate") == 0)
  {
    printf("c64->configure(OPT_SID_SAMPLING, SID_SAMPLE_INTERPOLATE);\n");
    wrapper->c64->configure(OPT_SID_ENGINE, SIDENGINE_RESID);
    wrapper->c64->configure(OPT_SID_SAMPLING, reSID::SAMPLE_INTERPOLATE);
  }
  else if( strcmp(engine,"ReSID resample") == 0)
  {
    printf("c64->configure(OPT_SID_SAMPLING, SID_SAMPLE_RESAMPLE);\n");
    wrapper->c64->configure(OPT_SID_ENGINE, SIDENGINE_RESID);
    wrapper->c64->configure(OPT_SID_SAMPLING, reSID::SAMPLE_RESAMPLE);
  }


  if(wasRunning)
  {
    wrapper->c64->run();
  }

}


extern "C" void wasm_set_color_palette(char* palette)
{

  if( strcmp(palette,"color") == 0)
  {
    wrapper->c64->configure(OPT_PALETTE, PALETTE_COLOR);
  }
  else if( strcmp(palette,"black white") == 0)
  { 
    wrapper->c64->configure(OPT_PALETTE, PALETTE_BLACK_WHITE); 
  }
  else if( strcmp(palette,"paper white") == 0)
  { 
    wrapper->c64->configure(OPT_PALETTE, PALETTE_PAPER_WHITE); 
  }
  else if( strcmp(palette,"green") == 0)
  { 
    wrapper->c64->configure(OPT_PALETTE, PALETTE_GREEN); 
  }
  else if( strcmp(palette,"amber") == 0)
  { 
    wrapper->c64->configure(OPT_PALETTE, PALETTE_AMBER); 
  }
  else if( strcmp(palette,"sepia") == 0)
  { 
    wrapper->c64->configure(OPT_PALETTE, PALETTE_SEPIA); 
  }
}


extern "C" u64 wasm_get_cpu_cycles()
{
  return wrapper->c64->cpu.cycle;
}