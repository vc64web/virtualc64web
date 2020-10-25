/*!
 * @file        mainsdl.cpp
 * @author      mithrendal and Dirk W. Hoffmann, www.dirkwhoffmann.de
 * @copyright   Dirk W. Hoffmann. All rights reserved.
 */

#include <stdio.h>
#include "C64.h"
#include "C64_types.h"
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

int emu_width  = NTSC_PIXELS; //428
int emu_height = PAL_RASTERLINES; //284
int eat_border_width = 0;
int eat_border_height = 0;
int xOff = 12 + eat_border_width;
int yOff = 12 + eat_border_height;
int clipped_width  = NTSC_PIXELS -12 -24 -2*eat_border_width; //392
int clipped_height = PAL_RASTERLINES -12 -24 -2*eat_border_height; //248

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

  if(c64->getWarp() == true)
  {
    printf("warping at least 25 cycles at once ...\n");
    int i=25;
    while(c64->getWarp() == true && i>0)
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
    printf("time[ms]=%lf, audio_samples=%d, frames [executed=%u, rendered=%u]\n", passed_time, sum_samples, executed_frame_count, rendered_frame_count);
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
      if (typeof draw_one_frame === 'undefined')
          return;
      draw_one_frame(); // to gather joystick information for example 
  });
 
  Uint8 *texture = (Uint8 *)c64->vic.screenBuffer();

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
    c64->sid.readMonoSamples((float *)stream, n);
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

    SDL_PauseAudioDevice(device_id, 0); //unpause the audio device
    
    //listen to mouse, finger and keys
    SDL_SetEventFilter(eventFilter, thisC64);

//  wasm_create_renderer((char*)"webgl");
}




void theListener(const void *, int type, long data){
  if(0!=strcmp("MSG_CHARSET", msg_code[type].c_str()))
  {
    printf("vC64 message=%s, data=%ld\n", msg_code[type].c_str(), data);

    EM_ASM({
        if (typeof message_handler === 'undefined')
            return;
        message_handler( $0 );}, msg_code[type].c_str() );    

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

    c64->addListener(this, &theListener);

  }
  ~C64Wrapper()
  {
        printf("closing wrapper");
  }

  void run()
  {
    printf("wrapper calls 4x c64->loadRom(...) method\n");
    c64->loadRom("roms/kernal.901227-03.bin");
    c64->loadRom("roms/basic.901226-01.bin");
    c64->loadRom("roms/characters.901225-01.bin");
    c64->loadRom("roms/1541-II.251968-03.bin");
    printf("wrapper calls run on c64->run() method\n");

    //c64->setTakeAutoSnapshots(false);
    //c64->setWarpLoad(true);
    c64->vic.emulateGrayDotBug=false;
 //   c64->dump();
 //   c64->drive1.dump();
    //c64->setDebugLevel(2);
    //c64->sid.setDebugLevel(4);
 //   c64->drive1.setDebugLevel(3);
 //   c64->sid.dump();
    c64->run();
    printf("after run ...\n");
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
      wrapper->c64->keyboard.pressRestoreKey();
    }
    else
    {
      wrapper->c64->keyboard.releaseRestoreKey();
    }
  }
  else if(pressed==1)
  {
    wrapper->c64->keyboard.pressKey(code1, code2);
  }
  else
  {
    wrapper->c64->keyboard.releaseKey(code1, code2);
  }
}






VC1541 *selected_drive = NULL;
AnyArchive *selected_archive = NULL;
void insertDisk(void *c64) 
{
//  printf("time[ms]=%lf insert disk\n",emscripten_get_now());
  selected_drive->insertDisk(selected_archive);
}
void prepareToInsert(void *c64) 
{
//  printf("time[ms]=%lf prepare to insert\n",emscripten_get_now());
  selected_drive->prepareToInsert();
  emscripten_async_call(insertDisk, c64, 300);
}
void ejectDisk(void *c64) 
{
//  printf("time[ms]=%lf eject disk\n",emscripten_get_now());
  selected_drive->ejectDisk();
  emscripten_async_call(prepareToInsert, c64, 300);
}

void changeDisk(AnyArchive *a, int iDriveNumber)
{
  VC1541 *drive = NULL;
  
  if(iDriveNumber == 8)
  {
    drive = &(wrapper->c64->drive1);
  }
  else if(iDriveNumber == 9)
  {
    drive = &(wrapper->c64->drive2);
  }
  selected_drive = drive;
  selected_archive = a;
 
  if( drive->hasDisk() ) {
//    printf("time[ms]=%lf prepared to eject\n",emscripten_get_now());
    drive->prepareToEject();
    emscripten_async_call(ejectDisk, wrapper->c64, 300);
  }
  else
  {
//    printf("time[ms]=%lf prepare to insert\n",emscripten_get_now());
    drive->prepareToInsert();
    emscripten_async_call(insertDisk, wrapper->c64, 300);
  }
}

extern "C" Uint8 *wasm_pull_user_snapshot_file(unsigned nr)
{
  printf("wasm_pull_user_snapshot_file nr=%u\n", nr);
  Snapshot *snapshot = wrapper->c64->userSnapshot(nr);
  
  size_t size = snapshot->writeToBuffer(NULL);
  uint8_t *buffer = new uint8_t[size];
  snapshot->writeToBuffer(buffer);
  return buffer;
}
extern "C" size_t wasm_pull_user_snapshot_file_size(unsigned nr)
{
  printf("wasm_pull_user_snapshot_file_size nr=%u\n", nr);
  Snapshot *snapshot = wrapper->c64->userSnapshot(nr);
  size_t size = snapshot->writeToBuffer(NULL);
  return size;
}


extern "C" void wasm_take_user_snapshot()
{
  wrapper->c64->takeUserSnapshot();
}



extern "C" void wasm_set_take_auto_snapshots(unsigned enable)
{
  wrapper->c64->setTakeAutoSnapshots(enable == 1);
}

extern "C" void wasm_restore_auto_snapshot(unsigned nr)
{
  wrapper->c64->restoreAutoSnapshot(nr);
}


extern "C" Uint8 *wasm_pull_auto_snapshot(unsigned nr)
{
  printf("wasm_pull_user_snapshot nr=%u\n", nr);
  Snapshot *snapshot = wrapper->c64->autoSnapshot(nr);
  return snapshot->getImageData();
}

extern "C" unsigned wasm_auto_snapshot_width(unsigned nr)
{
  Snapshot *snapshot = wrapper->c64->autoSnapshot(nr);
  return snapshot->getImageWidth();
}
extern "C" unsigned wasm_auto_snapshot_height(unsigned nr)
{
  Snapshot *snapshot = wrapper->c64->autoSnapshot(nr);
  return snapshot->getImageHeight();
}

extern "C" size_t wasm_auto_snapshots_count()
{
  return wrapper->c64->numAutoSnapshots();
}

extern "C" void wasm_suspend_auto_snapshots()
{
  return wrapper->c64->suspendAutoSnapshots();
}

extern "C" void wasm_resume_auto_snapshots()
{
  return wrapper->c64->resumeAutoSnapshots();
}



extern "C" void wasm_set_warp(unsigned on)
{
  wrapper->c64->setWarpLoad(on == 1);
}


extern "C" void wasm_set_borderless(unsigned on)
{
  //NTSC_PIXEL=428
  //PAL_RASTERLINES=284 

  eat_border_width = on*35;
  xOff = 12 + eat_border_width;
  clipped_width  = NTSC_PIXELS -12 -24 -2*eat_border_width; //392
//428-12-24-2*33 =326

  eat_border_height = on*24;
  yOff = 10 + eat_border_height;
  clipped_height = PAL_RASTERLINES -10 -24 -2*eat_border_height; //248
//284-11-24-2*22=205
 
  SDL_SetWindowMinimumSize(window, clipped_width, clipped_height);
  SDL_RenderSetLogicalSize(renderer, clipped_width, clipped_height); 
  SDL_SetWindowSize(window, clipped_width, clipped_height);

}

extern "C" const char* wasm_loadFile(char* name, Uint8 *blob, long len)
{
  printf("load file=%s len=%ld, header bytes= %x, %x, %x\n", name, len, blob[0],blob[1],blob[2]);
  filename=name;
  if(wrapper == NULL)
  {
    return "";
  }
  if (checkFileSuffix(name, ".D64") || checkFileSuffix(name, ".d64")) {
    printf("isD64\n");
    changeDisk(D64File::makeWithBuffer(blob, len),8);
  }
  else if (checkFileSuffix(name, ".G64") || checkFileSuffix(name, ".g64")) {
    printf("isG64\n");
    changeDisk(G64File::makeWithBuffer(blob, len),8);
  }
  else if (checkFileSuffix(name, ".PRG") || checkFileSuffix(name, ".prg")) {
    printf("isPRG\n");
    wrapper->c64->flash(PRGFile::makeWithBuffer(blob, len),0);
  }
  else if (checkFileSuffix(name, ".CRT")|| checkFileSuffix(name, ".crt")) {
    printf("isCRT\n");
    wrapper->c64->expansionport.attachCartridge( Cartridge::makeWithCRTFile(wrapper->c64,(CRTFile::makeWithBuffer(blob, len))));
    wrapper->c64->reset();
  }
  else if (checkFileSuffix(name, ".TAP")|| checkFileSuffix(name, ".tap")) {
    printf("isTAP\n");
    wrapper->c64->datasette.insertTape(TAPFile::makeWithBuffer(blob, len));
    wrapper->c64->datasette.rewind();
  //  wrapper->c64->datasette.pressPlay();
  //  wrapper->c64->datasette.pressStop();
  }
  else if (checkFileSuffix(name, ".T64")|| checkFileSuffix(name, ".t64")) {
    printf("isT64\n");
    wrapper->c64->flash(T64File::makeWithBuffer(blob, len),0);
  }
  else if (checkFileSuffix(name, ".vc64")|| checkFileSuffix(name, ".vc64")) {
    printf("isSnapshot\n");
    wrapper->c64->loadFromSnapshotSafe(Snapshot::makeWithBuffer(blob, len));
  }
  else /*if (checkFileSuffix(name, ".BIN")|| checkFileSuffix(name, ".bin"))*/ {
 //   printf("\n");
    //wrapper->c64->flash(ROMFile::makeWithBuffer(blob, len),0);

    bool result;
    bool wasRunnable = wrapper->c64->isRunnable();
    //ROMFile *rom = ROMFile::makeWithFile(name);
    ROMFile *rom = ROMFile::makeWithBuffer(blob, len);

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
    
    if (!wasRunnable && wrapper->c64->isRunnable())
    {
        wrapper->c64->putMessage(MSG_READY_TO_RUN);
    }
    
    const char *rom_type="";
    if(rom->isKernalRomBuffer(blob, len))
    {
      rom_type = "kernal_rom";
    }
    else if(rom->isVC1541RomBuffer(blob, len))
    {
      rom_type = "vc1541_rom";
    }
    else if(rom->isCharRomBuffer(blob, len))
    {
      rom_type = "char_rom";
    }
    else if(rom->isBasicRomBuffer(blob, len))
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
  wrapper->c64->halt();
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

  JoystickEvent code;
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
    wrapper->c64->port1.trigger(code);
  }
  else if(joyport == '2')
  {
    wrapper->c64->port2.trigger(code);
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
  if(SID_Model == 6581)
  {
    wrapper->c64->sid.setModel(MOS_6581);
  }
  else if(SID_Model == 8580)
  {
    wrapper->c64->sid.setModel(MOS_8580);  
  }
}