/*!
 * @file        mainsdl.cpp
 * @author      mithrendal and Dirk W. Hoffmann, www.dirkwhoffmann.de
 * @copyright   Dirk W. Hoffmann. All rights reserved.
 */

#include <stdio.h>
#include "config.h"
#include "C64.h"
#include "C64Types.h"

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
    //C64 *c64 = (C64 *)thisC64;
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

  EM_ASM({
 //     if (typeof draw_one_frame === 'undefined')
 //         return;
      draw_one_frame(); // to gather joystick information for example 
  });

  while(total_executed_frame_count < targetFrameCount) {
    executed_frame_count++;
    total_executed_frame_count++;

    c64->executeOneFrame();
  }

  rendered_frame_count++;  
 
  Uint8 *texture = (Uint8 *)c64->vic.stableEmuTexture(); //screenBuffer();

//  int surface_width = window_surface->w;
//  int surface_height = window_surface->h;

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
    c64->muxer.copyMono((float *)stream, n);
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
    if(SDL_Init(SDL_INIT_VIDEO/*|SDL_INIT_AUDIO*/)==-1)
    {
        printf("Could not initialize SDL:%s\n", SDL_GetError());
    } 

    //listen to mouse, finger and keys
//   SDL_SetEventFilter(eventFilter, thisC64);
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

void send_message_to_js(const char * msg, long data)
{
    EM_ASM(
    {
        if (typeof message_handler === 'undefined')
            return;
        message_handler( "MSG_"+UTF8ToString($0), $1 );
    }, msg, data );    

}

bool paused_the_emscripten_main_loop=false;
bool warp_mode=false;
void theListener(const void * c64, long type, long data){
  
  if(warp_mode && type == MSG_IEC_BUS_BUSY && !((C64 *)c64)->inWarpMode())
  {
    ((C64 *)c64)->warpOn(); //setWarp(true);
  }
  else if(type == MSG_IEC_BUS_IDLE && ((C64 *)c64)->inWarpMode())
  {
    ((C64 *)c64)->warpOff(); //setWarp(false);
  }

  const char *message_as_string =  (const char *)MsgTypeEnum::key((MsgType)type);
  printf("vC64 message=%s, data=%ld\n", message_as_string, data);
  send_message_to_js(message_as_string, data);


/*  if(type == MSG_RUN)
  {
    if(paused_the_emscripten_main_loop)
    {
      printf("emscripten_resume_main_loop at MSG_RUN\n");
      emscripten_resume_main_loop();
    }
    else
    {
      printf("emscripten_set_main_loop_arg() at MSG_RUN\n");
      emscripten_set_main_loop_arg(draw_one_frame_into_SDL, (void *)c64, 0, 1);
      printf("after emscripten_set_main_loop_arg() at MSG_RUN\n");

    }
  }
  else if(type == MSG_PAUSE)
  {
    printf("emscripten_pause_main_loop() at MSG_PAUSE\n");
    paused_the_emscripten_main_loop=true;
    emscripten_pause_main_loop();
      printf("after emscripten_set_main_loop_arg() at MSG_RUN\n");

  }
*/

  if(type == MSG_DISK_INSERT)
  {
    ((C64 *)c64)->drive8.dump();
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

    c64->msgQueue.setListener(this->c64, &theListener);
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

    try { c64->isReady(); } catch(...) { c64->msgQueue.put(MSG_ROM_MISSING); }
    /*
    EM_ASM({
      setTimeout(function() {message_handler( $0 );}, 0);
    }, msg_code[MSG_ROM_MISSING].c_str() );
*/

    printf("v4 wrapper calls run on c64->run() method\n");

    //c64->setTakeAutoSnapshots(false);
    //c64->setWarpLoad(true);
    c64->configure(OPT_GRAY_DOT_BUG, false);
    c64->configure(OPT_VIC_REVISION, VICII_PAL_6569_R1);

    c64->configure(OPT_SID_ENGINE, SIDENGINE_RESID);
//    c64->configure(OPT_SID_SAMPLING, SID_SAMPLE_INTERPOLATE);


    // master Volumne
    c64->configure(OPT_AUDVOLL, 100); 
    c64->configure(OPT_AUDVOLR, 100);

    //SID0 Volumne
    c64->configure(OPT_AUDVOL, 0, 100); 
    c64->configure(OPT_AUDPAN, 0, 0);

    c64->configure(OPT_DRV_AUTO_CONFIG,DRIVE8,1);
    //SID1 Volumne
/*    c64->configure(OPT_AUDVOL, 1, 100);
    c64->configure(OPT_AUDPAN, 1, 50);
    c64->configure(OPT_SID_ENABLE, 1, true);
    c64->configure(OPT_SID_ADDRESS, 1, 0xd420);
*/


    //c64->configure(OPT_HIDE_SPRITES, true); 
    //c64->dump();

 //printf("is running = %u\n",c64->isRunning()); 
 //   c64->dump();
 //   c64->drive1.dump();
 //   c64->setDebugLevel(2);
    //c64->sid.setDebugLevel(4);
 //   c64->drive1.setDebugLevel(3);
 //   c64->sid.dump();


/*
    c64->configure(OPT_DRV_POWER_SAVE, 8, true); 
    c64->configure(OPT_SID_POWER_SAVE, true); 
    c64->configure(OPT_VIC_POWER_SAVE, true); 

*/

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

extern "C" void wasm_keyboard_reset()
{
  printf("wasm_keyboard_reset\n");
  wrapper->c64->keyboard.reset(true);
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
    wrapper->c64->keyboard.press(C64Key(code1,code2));
  }
  else
  {
    wrapper->c64->keyboard.release(C64Key(code1,code2));
    //wrapper->c64->keyboard.releaseRowCol(code1, code2);
  }
}

extern "C" void wasm_schedule_key(int code1, int code2, int pressed, int frame_delay)
{
  if(code1 == 9 && code2 == 9)
  {
    if(pressed == 1)
    {
      printf("scheduleKeyPress ( 31, %d ) \n", frame_delay);
      wrapper->c64->keyboard.scheduleKeyPress(31, frame_delay);   //pressRestore();
    }
    else
    {
      printf("scheduleKeyRelease ( 31, %d ) \n", frame_delay);
      wrapper->c64->keyboard.scheduleKeyRelease(31, frame_delay);   //releaseRestore();
    }
  }
  else if(pressed==1)
  {
    printf("scheduleKeyPress ( %d, %d, %d ) \n", code1, code2, frame_delay);

    wrapper->c64->keyboard.scheduleKeyPress(C64Key(code1,code2), frame_delay);
  }
  else
  {
    printf("scheduleKeyRelease ( %d, %d, %d ) \n", code1, code2, frame_delay);

    wrapper->c64->keyboard.scheduleKeyRelease(C64Key(code1,code2), frame_delay);
  }
}


char wasm_pull_user_snapshot_file_json_result[255];

extern "C" char* wasm_export_disk()
{
  if(!wrapper->c64->drive8.hasDisk())
  {
    printf("no disk in drive8\n");
    sprintf(wasm_pull_user_snapshot_file_json_result, "{\"size\": 0 }");
    return wasm_pull_user_snapshot_file_json_result;
  }

//  FSDevice *fs = FSDevice::makeWithDisk(wrapper->c64->drive8.disk);    
//  D64File *d64 = D64File::makeWithFileSystem(*fs);

  FSDevice *fs = new FSDevice(*wrapper->c64->drive8.disk);
  D64File *d64 = new D64File(*fs);

/*  size_t size = d64->size;
  uint8_t *buffer = new uint8_t[size];
  d64->writeToBuffer(buffer);
  for(int i=0; i < 30; i++)
  {
    printf("%d",buffer[i]);
  }
  printf("\n");
  */
  sprintf(wasm_pull_user_snapshot_file_json_result, "{\"address\":%lu, \"size\": %lu }",
  (unsigned long)d64->data, 
  d64->size
  );
  printf("return => %s\n",wasm_pull_user_snapshot_file_json_result);
  return wasm_pull_user_snapshot_file_json_result;
}


Snapshot *snapshot=NULL;
extern "C" void wasm_delete_user_snapshot()
{
//  printf("request to free user_snapshot memory\n");

  if(snapshot!=NULL)
  {
    delete snapshot;
    snapshot=NULL;
    printf("freed user_snapshot memory\n");
  }
}

extern "C" char* wasm_pull_user_snapshot_file()
{
  printf("wasm_pull_user_snapshot_file\n");

  wasm_delete_user_snapshot();
  snapshot = wrapper->c64->latestUserSnapshot(); //wrapper->c64->userSnapshot(nr);
/*
  size_t size = snapshot->size; //writeToBuffer(NULL);
  uint8_t *buffer = new uint8_t[size];
  snapshot->writeToBuffer(buffer);
  for(int i=0; i < 30; i++)
  {
    printf("%d",buffer[i]);
  }
  printf("\n");
  */
  sprintf(wasm_pull_user_snapshot_file_json_result, "{\"address\":%lu, \"size\": %lu, \"width\": %lu, \"height\":%lu }",
  (unsigned long)snapshot->data, 
  snapshot->size,
  snapshot->getHeader()->screenshot.width,
  snapshot->getHeader()->screenshot.height
  );
  printf("return => %s\n",wasm_pull_user_snapshot_file_json_result);
  return wasm_pull_user_snapshot_file_json_result;
}

extern "C" void wasm_take_user_snapshot()
{
  wrapper->c64->requestUserSnapshot();
}


float sound_buffer[12*1024*2];
extern "C" float* wasm_get_sound_buffer_address()
{
  return sound_buffer;
}

extern "C" unsigned wasm_copy_into_sound_buffer()
{
  auto count=wrapper->c64->muxer.stream.count();
  auto copied_samples=0;
  for(;copied_samples+1024<=count;copied_samples+=1024)
  {
    wrapper->c64->muxer.copyMono((float *)sound_buffer+copied_samples, 1024);
  }
  sum_samples += copied_samples; 
  return copied_samples;
}

extern "C" unsigned wasm_copy_into_sound_buffer_stereo()
{
  auto count=wrapper->c64->muxer.stream.count();
  
  auto copied_samples=0;
  for(unsigned ipos=1024;ipos<=count;ipos+=1024)
  {
    wrapper->c64->muxer.copyStereo(
    sound_buffer+copied_samples,
     sound_buffer+copied_samples+1024, 
     1024); 
    copied_samples+=1024*2;
  }
  sum_samples += copied_samples; 

  return copied_samples/2;
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
    if(warp_mode)
      wrapper->c64->warpOn();
    else
      wrapper->c64->warpOff();
  }
}


extern "C" void wasm_set_borderless(float on)
{
  //NTSC_PIXEL=428
  //PAL_RASTERLINES=284 

  eat_border_width = 31 * on;
  xOff = 12 + eat_border_width + 92;
  clipped_width  = TEX_WIDTH -112 -24 -2*eat_border_width; //392
//428-12-24-2*33 =326

  eat_border_height = 34 * on ;
  yOff = 16 + eat_border_height;
  clipped_height = TEX_HEIGHT -42  -2*eat_border_height; //248
//284-11-24-2*22=205
 
  SDL_SetWindowMinimumSize(window, clipped_width, clipped_height);
  SDL_RenderSetLogicalSize(renderer, clipped_width, clipped_height); 
  SDL_SetWindowSize(window, clipped_width, clipped_height);

}


extern "C" const char* wasm_loadFile(char* name, Uint8 *blob, long len)
{
  printf("load file=%s len=%ld, header bytes= %x, %x, %x\n", name, len, blob[0],blob[1],blob[2]);
  filename=name;
  auto file_suffix= util::extractSuffix(name); 
  if(wrapper == NULL)
  {
    return "";
  }
  bool file_still_unprocessed=true;   
  if (D64File::isCompatible(filename)) {    
    try{
      printf("try to build D64File\n");
      D64File d64 = D64File(blob, len);
      auto disk = std::make_unique<Disk>(d64);
      printf("isD64\n");  
      wrapper->c64->drive8.insertDisk(std::move(disk));
      file_still_unprocessed=false;
    } catch(VC64Error &exception) {
      ErrorCode ec=exception.data;
      printf("%s\n", ErrorCodeEnum::key(ec));
    }
  }
  if (file_still_unprocessed && G64File::isCompatible(filename)) {
    try{
      printf("try to build G64File\n");
      G64File g64 = G64File(blob, len);
      auto disk = std::make_unique<Disk>(g64);
      printf("isG64 ...\n");  
      wrapper->c64->drive8.insertDisk(std::move(disk));
      file_still_unprocessed=false;
    } catch(VC64Error &exception) {
      ErrorCode ec=exception.data;
      printf("%s\n", ErrorCodeEnum::key(ec));
    }
  }
  if (file_still_unprocessed && PRGFile::isCompatible(filename)) {
    try
    {
      printf("try to build PRGFile\n");
      PRGFile *file = new PRGFile(blob, len);
      printf("isPRG\n");
      wrapper->c64->flash(*file ,0);
      file_still_unprocessed=false;
    }
    catch(VC64Error &exception) {
      ErrorCode ec=exception.data;
      printf("%s\n", ErrorCodeEnum::key(ec));
    }
  }
  if (file_still_unprocessed && CRTFile::isCompatible(filename)) {
    try
    {
      printf("try to build CRTFile\n");
      CRTFile *file = new CRTFile(blob, len);

      printf("isCRT\n");
      wrapper->c64->expansionport.attachCartridge( Cartridge::makeWithCRTFile(*(wrapper->c64),*file));
      wrapper->c64->reset(true);
      file_still_unprocessed=false;
    } 
    catch(VC64Error &exception) {
      ErrorCode ec=exception.data;
      printf("%s\n", ErrorCodeEnum::key(ec));
    }
  }
  if (file_still_unprocessed && TAPFile::isCompatible(filename)) {
    try
    {
      printf("try to build TAPFile\n");
      TAPFile *file = new TAPFile(blob, len);
      printf("isTAP\n");
      wrapper->c64->datasette.insertTape(*file);
      wrapper->c64->datasette.rewind();
  //  wrapper->c64->datasette.pressPlay();
  //  wrapper->c64->datasette.pressStop();
      file_still_unprocessed=false;
    }
    catch(VC64Error &exception) {
      ErrorCode ec=exception.data;
      printf("%s\n", ErrorCodeEnum::key(ec));
    }
  }
  if (file_still_unprocessed && T64File::isCompatible(filename)) {
    try
    {
      printf("try to build T64File\n");
      T64File *file = new T64File(blob, len);
      printf("isT64\n");
      wrapper->c64->flash(*file ,0);
      file_still_unprocessed=false;
    }
    catch(VC64Error &exception) {
      ErrorCode ec=exception.data;
      printf("%s\n", ErrorCodeEnum::key(ec));
    }
  }
  if (file_still_unprocessed && Snapshot::isCompatible(filename) && util::extractSuffix(filename)!="rom" && util::extractSuffix(filename)!="bin") {
    try
    {
      printf("try to build Snapshot\n");
      Snapshot *file = new Snapshot(blob, len);      
      printf("isSnapshot\n");
      wrapper->c64->loadSnapshot(*file);
      file_still_unprocessed=false;
    }
    catch(VC64Error &exception) {
      ErrorCode ec=exception.data;
      printf("%s\n", ErrorCodeEnum::key(ec));
    }
  }
  if(file_still_unprocessed)
  {
    bool wasRunnable = true;
    try { wrapper->c64->isReady(); } catch(...) { wasRunnable=false; }

    RomFile *rom = NULL;
    try
    {
      printf("try to build RomFile\n");
      rom = new RomFile(blob, len);
    }
    catch(VC64Error &exception) {
      printf("Failed to read ROM image file %s\n", name);
      ErrorCode ec=exception.data;
      printf("%s\n", ErrorCodeEnum::key(ec));
      return "";
    }
    
    wrapper->c64->suspend();
    try { 
      wrapper->c64->flash(*rom); 
      printf("Loaded ROM image %s.\n", name);
    }  
    catch(VC64Error &exception) { 
      printf("Failed to flash ROM image %s.\n", name);
      ErrorCode ec=exception.data;
      printf("%s\n", ErrorCodeEnum::key(ec));
    }
    wrapper->c64->resume();


    bool is_ready_now = true;
    try { wrapper->c64->isReady(); } catch(...) { is_ready_now=false; }

    if (!wasRunnable && is_ready_now)
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
      wrapper->c64->configure(OPT_DRV_CONNECT,DRIVE8,1);
      wrapper->c64->drive8.dump(dump::Config);
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
  wrapper->c64->reset(true);
}


extern "C" void wasm_halt()
{
  printf("wasm_halt\n");
  wrapper->c64->pause();

      printf("emscripten_pause_main_loop() at MSG_PAUSE\n");
    paused_the_emscripten_main_loop=true;
    emscripten_pause_main_loop();
      printf("after emscripten_set_main_loop_arg() at MSG_RUN\n");

}

extern "C" void wasm_run()
{
  printf("wasm_run\n");
  
  printf("is running = %u\n",wrapper->c64->isRunning());

  wrapper->c64->run();

  if(paused_the_emscripten_main_loop)
  {
    printf("emscripten_resume_main_loop at MSG_RUN\n");
    emscripten_resume_main_loop();
  }
  else
  {
    printf("emscripten_set_main_loop_arg() at MSG_RUN\n");
    emscripten_set_main_loop_arg(draw_one_frame_into_SDL, (void *)wrapper->c64, 0, 1);
    printf("after emscripten_set_main_loop_arg() at MSG_RUN\n");

  }

}


extern "C" void wasm_press_play()
{
  printf("wasm_press_play\n");
  wrapper->c64->datasette.pressPlay();
}
extern "C" void wasm_press_stop()
{
  printf("wasm_press_stop\n");
  wrapper->c64->datasette.pressStop();
}
extern "C" void wasm_rewind()
{
  printf("wasm_rewind\n");
  wrapper->c64->datasette.rewind();
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
//  wrapper->c64->configure(OPT_CUT_LAYERS, 0x1100 | (SPR0|SPR1|SPR2|SPR3|SPR4|SPR5|SPR6|SPR7)); 
//  printf("wasm_cut_layers(%u)",cut_layers);
  wrapper->c64->configure(OPT_CUT_LAYERS, cut_layers); 
}



char json_result[1024];
extern "C" const char* wasm_rom_info()
{
  sprintf(json_result, "{\"kernal\":\"%s\", \"basic\":\"%s\", \"charset\":\"%s\", \"has_floppy_rom\":%s, \"drive_rom\":\"%s\"}",

  wrapper->c64->hasMega65Rom(ROM_TYPE_KERNAL) ? "mega" : wrapper->c64->hasRom(ROM_TYPE_KERNAL) ? wrapper->c64->romTitle(ROM_TYPE_KERNAL).c_str(): "none", 
  wrapper->c64->hasMega65Rom(ROM_TYPE_BASIC) ? "mega" : wrapper->c64->hasRom(ROM_TYPE_BASIC) ? wrapper->c64->romTitle(ROM_TYPE_BASIC).c_str() : "none", 
  wrapper->c64->hasMega65Rom(ROM_TYPE_CHAR) ? "mega" : wrapper->c64->hasRom(ROM_TYPE_CHAR) ? wrapper->c64->romTitle(ROM_TYPE_CHAR).c_str(): "none",
  wrapper->c64->hasRom(ROM_TYPE_VC1541) ? "true":"false",
  wrapper->c64->romTitle(ROM_TYPE_VC1541).c_str()
  /*&& 
  wrapper->c64->drive8.getConfigItem(OPT_DRIVE_CONNECT)*/
  );

//  printf("json: %s\n",  json_result);


  printf("%s, %s, %s, %s\n",  wrapper->c64->romTitle(ROM_TYPE_KERNAL).c_str(),
  wrapper->c64->romTitle(ROM_TYPE_BASIC).c_str(),
  wrapper->c64->romTitle(ROM_TYPE_CHAR).c_str(),
  wrapper->c64->romTitle(ROM_TYPE_VC1541).c_str()
);
  return json_result;
}


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

extern "C" u8 wasm_peek(u16 addr)
{
  return wrapper->c64->mem.spypeek(addr);
}


extern "C" void wasm_write_string_to_ser(char* chars_to_send)
{
  wrapper->c64->write_string_to_ser(chars_to_send);
}

//const char chars_to_send[] = "HELLOMYWORLD!";
extern "C" void wasm_poke(u16 addr, u8 value)
{
    wrapper->c64->mem.poke(addr, value);
}

/*
char wasm_translate_json[255];
extern "C" char* wasm_translate(char c)
{
  auto key = C64Key::translate(c);
  sprintf(wasm_translate_json, "{\"size\": "+key.+" }");
  sprintf( wasm_translate_json);
  
  return wasm_translate_json;
}
*/

extern "C" void wasm_configure(char* option, unsigned on)
{
  bool on_value = (on == 1);

  printf("wasm_configure %s = %d\n", option, on);

  if(strcmp(option,"OPT_DRV_POWER_SAVE") == 0)
  {
    printf("calling c64->configure %s = %d\n", option, on);
    wrapper->c64->configure(OPT_DRV_POWER_SAVE, 8, on_value);
  }
  else if(strcmp(option,"OPT_SID_POWER_SAVE") == 0)
  {
    printf("calling c64->configure %s = %d\n", option, on);
    wrapper->c64->configure(OPT_SID_POWER_SAVE, on_value);
  }
  else if(strcmp(option,"OPT_VIC_POWER_SAVE") == 0)
  {
    printf("calling c64->configure %s = %d\n", option, on);
    wrapper->c64->configure(OPT_VIC_POWER_SAVE, on_value);
  }
  else if(strcmp(option,"OPT_SER_SPEED") == 0)
  {
    printf("calling c64->configure_rs232_ser_speed %d\n", on);
    wrapper->c64->configure_rs232_ser_speed(on);
  }
  else
  {
    printf("error !!!!! unknown option= %s\n", option);
  }
}

extern "C" void wasm_print_error(unsigned exception_ptr)
{
  if(exception_ptr == NULL || exception_ptr== 0)
    return;
  string s= std::string(reinterpret_cast<std::exception *>(exception_ptr)->what());
  printf("uncaught exception %u: %s\n",exception_ptr, s.c_str());
}



extern "C" void wasm_set_sample_rate(unsigned sample_rate)
{
    printf("set muxer to freq= %d\n", sample_rate);
    wrapper->c64->muxer.setSampleRate(sample_rate);
    printf("paula.muxer.getSampleRate()==%f\n", wrapper->c64->muxer.getSampleRate());
}

SDL_AudioDeviceID audio_device_id;
extern "C" void wasm_close_main_thread_audio()
{
  SDL_CloseAudioDevice(audio_device_id);
}
extern "C" void wasm_open_main_thread_audio()
{
    SDL_Init(SDL_INIT_AUDIO);

    SDL_AudioSpec want, have;
    
    SDL_memset(&want, 0, sizeof(want)); /* or SDL_zero(want) */
    want.freq = 44100;  //44100; // 22050;
    want.format = AUDIO_F32;
    want.channels = 1;
    //sample buffer 512 in original vc64, vc64web=512 under macOs ok, but iOS needs 2048;
    want.samples = 2048*2;
    want.callback = MyAudioCallback;
    want.userdata = wrapper->c64;   //will be passed to the callback
    audio_device_id = SDL_OpenAudioDevice(NULL, 0, &want, &have, SDL_AUDIO_ALLOW_FORMAT_CHANGE);
    if(audio_device_id == 0)
    {
        printf("Failed to open audio: %s\n", SDL_GetError());
    }

    printf("set SID to freq= %d\n", have.freq);
    wrapper->c64->muxer.setSampleRate(have.freq);
    printf("freq in SIDBridge= %f\n", wrapper->c64->muxer.getSampleRate());
 

    SDL_PauseAudioDevice(audio_device_id, 0); //unpause the audio device
}