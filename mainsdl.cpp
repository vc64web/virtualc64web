/*!
 * @file        mainsdl.cpp
 * @author      mithrendal and Dirk W. Hoffmann, www.dirkwhoffmann.de
 * @copyright   Dirk W. Hoffmann. All rights reserved.
 *
 *
 * v5.0 
 issues:
 -reset crashes/not working after games loaded
 -snapshot not working
 - Use VICIIAPI::getSpriteInfo instead
 -FileSystem *fs = new FileSystem(*wrapper->emu->drive8.drive->disk);
Eigentlich müsste die MediaFileAPI genug funktionalität haben (FileSystem lieber nicht benutzen)
 -snapshot = wrapper->emu->c64.takeSnapshot();
Use VirtualC64API::takeSnapshot() instead (i.e.: wrapper->emu->takeSnapshot())
 */
#include <stdio.h>
#include "config.h"
#include "VirtualC64.h"
#include "VirtualC64Types.h"
#include "Emulator.h"

#include <emscripten.h>
#include <SDL2/SDL.h>
#include <emscripten/html5.h>

using namespace vc64;

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

int emu_width  = Texture::width; //Texture.width; //NTSC_PIXELS; //428
int emu_height = Texture::height; //PAL_RASTERLINES; //284
int eat_border_width = 0;
int eat_border_height = 0;
int xOff = 12 + eat_border_width;
int yOff = 12 + eat_border_height;
int clipped_width  = Texture::width -12 -24 -2*eat_border_width; //392
int clipped_height = Texture::height -12 -24 -2*eat_border_height; //248

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

int eventFilter(void* the_emu, SDL_Event* event) {
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

 
bool requested_targetFrameCount_reset=false; 
int sum_samples=0;
double last_time = 0.0 ;
unsigned int executed_frame_count=0;
int64_t total_executed_frame_count=0;
double start_time=emscripten_get_now();
unsigned int rendered_frame_count=0;
unsigned int frames=0, seconds=0;
double frame_rate=50; //PAL
// The emscripten "main loop" replacement function.
void draw_one_frame_into_SDL(void *the_emu) 
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
  int64_t targetFrameCount = (int64_t)(elapsedTimeInSeconds * frame_rate);
 
  int max_gap = 8;


  VirtualC64 *emu = (VirtualC64 *)the_emu;
  emu->emu->update();

  if(emu->isWarping() == true)
  {
    printf("warping at least 25 frames at once ...\n");
    int i=25;
    while(emu->isWarping() == true && i>0)
    {
      //c64->emu->computeFrame();
      emu->emu->computeFrame();
      i--;
    }
    start_time=now;
    total_executed_frame_count=0;
    targetFrameCount=1;  
  }

  if(requested_targetFrameCount_reset)
  {
    start_time=now;
    total_executed_frame_count=0;
    targetFrameCount=1;
    requested_targetFrameCount_reset=false;
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

    emu->emu->computeFrame();
  }

  rendered_frame_count++;  
 
  Uint8 *texture = (Uint8 *)emu->videoPort.getTexture(); //screenBuffer();

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



void MyAudioCallback(void*  the_emu,
                       Uint8* stream,
                       int    len)
{
    VirtualC64 *emu = (VirtualC64 *)the_emu;
    
    int n = len /  sizeof(float);
    emu->audioPort.copyMono((float *)stream, n);
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



void initSDL(void *the_emu)
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
//void theListener(const void * c64, long type, long data){
void theListener(const void * c64, Message msg){

  if(warp_mode && msg.type == MSG_SER_BUSY && !((VirtualC64 *)c64)->isWarping())
  {
    ((VirtualC64 *)c64)->warpOn(); //setWarp(true);
  }
  else if(msg.type == MSG_SER_IDLE && ((VirtualC64 *)c64)->isWarping())
  {
    ((VirtualC64 *)c64)->warpOff(); //setWarp(false);
  }

  const char *message_as_string =  (const char *)MsgTypeEnum::key((MsgType)msg.type);
  printf("vC64 message=%s, data=%ld\n", message_as_string, msg.value);
  send_message_to_js(message_as_string, msg.value);


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

  if(msg.type == MSG_DISK_INSERT)
  {
    ((VirtualC64 *)c64)->drive8.drive->dump(Category::Debug);
  }

  if(msg.type == MSG_PAL) {
    printf("switched to PAL\n");
    frame_rate = 50.0;
    requested_targetFrameCount_reset=true;
    EM_ASM({PAL_VIC=true});
  }
  else if(msg.type == MSG_NTSC) {
    printf("switched to NTSC\n");
    frame_rate = 60.0;
    requested_targetFrameCount_reset=true;
    EM_ASM({PAL_VIC=false});
  }
}



class C64Wrapper {
  public:
    VirtualC64 *emu;

  C64Wrapper()
  {
    printf("constructing C64 ...\n");

    this->emu = new VirtualC64();

    printf("adding a listener to C64 message queue...\n");


    //c64->msgQueue.setListener(this->c64, &theListener);
    try
    {
      emu->launch(this->emu, &theListener);
    } catch(std::exception &exception) {
      printf("%s\n", exception.what());
    }
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
 printf("v5 run start\n");

    try { emu->isReady(); } catch(...) { 
        EM_ASM({
          setTimeout(function() {message_handler( 'MSG_ROM_MISSING' );}, 0);
        });
    }
    /*
    EM_ASM({
      setTimeout(function() {message_handler( $0 );}, 0);
    }, msg_code[MSG_ROM_MISSING].c_str() );
*/


    //emu->setTakeAutoSnapshots(false);
    //emu->setWarpLoad(true);
    emu->set(OPT_VICII_GRAY_DOT_BUG, false);
    emu->set(OPT_VICII_REVISION, VICII_PAL_6569_R1);

    emu->set(OPT_SID_ENGINE, SIDENGINE_RESID);
//    c64->configure(OPT_SID_SAMPLING, SID_SAMPLE_INTERPOLATE);


    // master Volumne
    emu->set(OPT_AUD_VOL_L, 100); 
    emu->set(OPT_AUD_VOL_R, 100);

    //SID0 Volumne
    #ifdef TODO
    emu->set(OPT_AUD_VOL0, 0, 100); 
   emu->set(OPT_AUD_PAN0, 0, 0);
    #endif
    
    emu->set(OPT_DRV_AUTO_CONFIG,DRIVE8,1);
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
 //   emu->setDebugLevel(2);
    //emuid.setDebugLevel(4);
 //   c64->drive1.setDebugLevel(3);
 //   emuid.dump();


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
  initSDL(wrapper->emu);
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
//  wrapper->emu->keyboard.keyboard->reset(true);
  wrapper->emu->keyboard.releaseAll();
}


extern "C" void wasm_auto_type(char* text)
{
  wrapper->emu->keyboard.autoType(text);
}

extern "C" void wasm_key(int code1, int code2, int pressed)
{
  printf("wasm_key ( %d, %d, %d ) \n", code1, code2, pressed);

  if(code1 == 9 && code2 == 9)
  {
    if(pressed == 1)
    {
      wrapper->emu->keyboard.keyboard->press(C64Key::restore);
    }
    else
    {
      wrapper->emu->keyboard.keyboard->release(C64Key::restore);
    }
  }
  else if(pressed==1)
  {
    wrapper->emu->keyboard.keyboard->press(C64Key(code1,code2));
  }
  else
  {
    wrapper->emu->keyboard.keyboard->release(C64Key(code1,code2));
    //wrapper->emu->keyboard.releaseRowCol(code1, code2);
  }
}

extern "C" void wasm_schedule_key(int code1, int code2, int pressed, int frame_delay)
{
  if(code1 == 9 && code2 == 9)
  {
    if(pressed == 1)
    {
      printf("scheduleKeyPress ( 31, %d ) \n", frame_delay);
     // wrapper->emu->keyboard.keyboard->scheduleKeyPress(31, frame_delay);   //pressRestore();
      wrapper->emu->put(CMD_KEY_PRESS, KeyCmd(31,frame_delay / frame_rate));
    }
    else
    {
      printf("scheduleKeyRelease ( 31, %d ) \n", frame_delay);
     // wrapper->emu->keyboard.scheduleKeyRelease(31, frame_delay);   //releaseRestore();
      wrapper->emu->put(CMD_KEY_RELEASE, KeyCmd(31,frame_delay / frame_rate));
    }
  }
  else if(pressed==1)
  {
    printf("scheduleKeyPress ( %d, %d, %f ) \n", code1, code2, frame_delay / frame_rate);
//    wrapper->emu->keyboard.scheduleKeyPress(C64Key(code1,code2), frame_delay);
//#ifdef TODO
      auto xxx =C64Key(code1, code2);
      wrapper->emu->put(CMD_KEY_PRESS, KeyCmd(xxx.nr,frame_delay/ frame_rate ));
//#endif
//      wrapper->emu->keyboard.keyboard->press(C64Key(code1,code2));
  }
  else
  {
    printf("scheduleKeyRelease ( %d, %d, %f ) \n", code1, code2, frame_delay / frame_rate);
    //wrapper->emu->keyboard.scheduleKeyRelease(C64Key(code1,code2), frame_delay);
//    #ifdef TODO
    auto xxx =C64Key(code1, code2);
    wrapper->emu->put(CMD_KEY_RELEASE, KeyCmd(xxx.nr,frame_delay / frame_rate));
//    #endif
//    wrapper->emu->keyboard.keyboard->release(C64Key(code1,code2));
  }
  wrapper->emu->emu->update();
}


char wasm_pull_user_snapshot_file_json_result[255];

extern "C" char* wasm_export_disk()
{
//  if(!wrapper->emu->drive8.drive->hasDisk())
  if(!wrapper->emu->drive8.getInfo().hasDisk)  
  {
    printf("no disk in drive8\n");
    sprintf(wasm_pull_user_snapshot_file_json_result, "{\"size\": 0 }");
    return wasm_pull_user_snapshot_file_json_result;
  }

//  FSDevice *fs = FSDevice::makeWithDisk(wrapper->emu->drive8.disk);    
//  D64File *d64 = D64File::makeWithFileSystem(*fs);

  FileSystem *fs = new FileSystem(*wrapper->emu->drive8.drive->disk);
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

MediaFile *snap_file=NULL;
extern "C" char* wasm_pull_user_snapshot_file_()
{
  printf("wasm_pull_user_snapshot_file\n");

  snap_file = wrapper->emu->c64.takeSnapshot();
  wrapper->emu->c64.loadSnapshot(*snap_file);

  printf("return => %s\n",wasm_pull_user_snapshot_file_json_result);
  return wasm_pull_user_snapshot_file_json_result;
}

extern "C" char* wasm_pull_user_snapshot_file_geht_auch()
{
  printf("wasm_pull_user_snapshot_file\n");

  auto *snapshot = wrapper->emu->c64.takeSnapshot();
  wrapper->emu->c64.loadSnapshot(*snapshot);
  
  printf("return => %s\n",wasm_pull_user_snapshot_file_json_result);
  return wasm_pull_user_snapshot_file_json_result;
}

extern "C" char* wasm_pull_user_snapshot_file()
{

  printf("sizeof = %d\n", (int)sizeof(long long));
  printf("wasm_pull_user_snapshot_file\n");
  printf("----dump checksum\n"); 
  wrapper->emu->c64.c64->dump(Category::Checksums);

  printf("----take snapshot\n");
  auto *snapshot = wrapper->emu->c64.takeSnapshot();
  printf("----make snapshot\n");
  auto *file = MediaFile::make(snapshot->getData(), snapshot->getSize(), FILETYPE_SNAPSHOT);
  printf("----load snapshot\n");
  wrapper->emu->c64.loadSnapshot(*snapshot);
  
  printf("return => %s\n",wasm_pull_user_snapshot_file_json_result);
  return wasm_pull_user_snapshot_file_json_result;
}



extern "C" char* wasm_pull_user_snapshot_file_old()
{
  printf("wasm_pull_user_snapshot_file\n");

  //snapshot = wrapper->emu->latestUserSnapshot(); //wrapper->emu->userSnapshot(nr);

  auto *snapshot = wrapper->emu->c64.takeSnapshot();
  printf("orig %ld\n",snapshot->getSize());
/*  for (int i = 0; i < 120; ++i) {
        printf("%02X,", snapshot->getData()[i]);
  }
  printf("\n");
*/
  auto *file = MediaFile::make(snapshot->getData(), snapshot->getSize(), FILETYPE_SNAPSHOT);
 // auto *file = new Snapshot(snapshot->getData(), snapshot->getSize());
 
  printf("type %d %d\n",snapshot->type(), file->type());
  printf("fnv %llx %llx\n",snapshot->fnv(), file->fnv());
 
 
  printf("media %ld\n",snapshot->getSize());
  for (int i = 0; i < snapshot->getSize(); ++i) {
      if(snapshot->getData()[i] != file->getData()[i] || i>snapshot->getSize()-10)
      {
        printf("%u: %02X,", i, snapshot->getData()[i]);
//        printf("%u: %02X,", i, snapshot->getData()[i]);
      }
  }
  printf("\n");

  wrapper->emu->c64.loadSnapshot(*snapshot);


/*  snapshot = wrapper->emu->c64.takeSnapshot();
  printf(" %ld\n",snapshot->getSize());
  printf("try to build Snapshot\n");
  auto file = MediaFile::make(snapshot->getData(), snapshot->getSize(), 
    FILETYPE_SNAPSHOT);
  printf("isSnapshot\n");
  wrapper->emu->c64.loadSnapshot(*file);

  printf("loaded\n");
*/
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
  (unsigned long)snapshot->getData(), 
  snapshot->getSize(),
//  snapshot->getHeader()->screenshot.width,
//  snapshot->getHeader()->screenshot.height
  snapshot->previewImageSize().first,
  snapshot->previewImageSize().second
  );
  printf("return => %s\n",wasm_pull_user_snapshot_file_json_result);
  return wasm_pull_user_snapshot_file_json_result;
}

extern "C" void wasm_take_user_snapshot()
{
 // wrapper->emu->requestUserSnapshot();
}


float sound_buffer[12*1024*2];
extern "C" float* wasm_get_sound_buffer_address()
{
  return sound_buffer;
}

extern "C" unsigned wasm_copy_into_sound_buffer()
{
 // auto count=wrapper->emu->audioPort.stream.count();
  auto count=wrapper->emu->audioPort.audioPort->count();
  auto copied_samples=0;
  for(;copied_samples+1024<=count;copied_samples+=1024)
  {
    wrapper->emu->audioPort.copyMono((float *)sound_buffer+copied_samples, 1024);
  }
  sum_samples += copied_samples; 
  return copied_samples;
}

extern "C" unsigned wasm_copy_into_sound_buffer_stereo()
{
  auto count=wrapper->emu->audioPort.audioPort->count();
  
  auto copied_samples=0;
  for(unsigned ipos=1024;ipos<=count;ipos+=1024)
  {
    wrapper->emu->audioPort.copyStereo(
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

  wrapper->emu->set(OPT_EMU_WARP_MODE, warp_mode? WARP_AUTO : WARP_NEVER);
/*  if(wrapper->emu->serialPort.serialPort->isTransferring() && 
      (
        (wrapper->emu->isWarping() && warp_mode == false)
        ||
        (wrapper->emu->isWarping() == false && warp_mode)
      )
  )
  {
    if(warp_mode)
      wrapper->emu->warpOn();
    else
      wrapper->emu->warpOff();
  }
  */
}

bool borderless=false;
void calculate_viewport()
{
  auto pal = frame_rate < 60;//wrapper->emu->vicii.vicii->pal();

  if(pal)
  {
    eat_border_width = 31 * borderless;
    xOff = 12 + eat_border_width + 92;
    clipped_width  = Texture::width -112 -24 -2*eat_border_width; //392
  //428-12-24-2*33 =326

    eat_border_height = 34 * borderless;
    yOff = 16 + eat_border_height;
    clipped_height = Texture::height -42  -2*eat_border_height; //248
  //284-11-24-2*22=205
  }
  else //NTSC
  {
    eat_border_width = borderless? 31:0;
    eat_border_height = borderless ? 9 :0;
    auto ntsc_height=220;
    auto ntsc_width = 370;
    auto ntsc_xoffset = 12 + 6/*NTSC*/ + eat_border_width + 92; 
    clipped_height = ntsc_height -2*eat_border_height;

    if(borderless)
    {
      eat_border_width = 31; //redundant
      xOff = 12 + eat_border_width + 92;
      clipped_width  = Texture::width -112 -24 -2*eat_border_width; //392
      if(  wrapper->emu->get(OPT_VICII_REVISION) ==VICII_NTSC_6567_R56A)
      {
        eat_border_height++;
      }
    }
    else
    {
      clipped_width = ntsc_width;
  //  printf("xOff=%u + ntsc_off=%i\n", xOff,ntsc_xoffset);
      xOff =  ntsc_xoffset;
    }
    yOff = 16 + eat_border_height;
  }  
  SDL_SetWindowMinimumSize(window, clipped_width, clipped_height);
  SDL_RenderSetLogicalSize(renderer, clipped_width, clipped_height); 
  SDL_SetWindowSize(window, clipped_width, clipped_height);
}


extern "C" void wasm_set_PAL(unsigned on)
{
  wrapper->emu->set(OPT_VICII_REVISION, on == 0 ? VICII_NTSC_8562 : VICII_PAL_6569_R1);
  printf("set to =%s\n", frame_rate<60 ? "PAL":"NTSC");
  calculate_viewport();
}

extern "C" void wasm_set_borderless(unsigned on)
{
  borderless= on==1;
  calculate_viewport();
}

string
extractSuffix(const string &s)
{
    auto idx = s.rfind('.');
    auto pos = idx != string::npos ? idx + 1 : 0;
    auto len = string::npos;
    return s.substr(pos, len);
}

extern "C" const char* wasm_loadFile(char* name, Uint8 *blob, long len)
{
  printf("load file=%s len=%ld, header bytes= %x, %x, %x\n", name, len, blob[0],blob[1],blob[2]);
  filename=name;
//  auto file_suffix= util::extractSuffix(name); 
  if(wrapper == NULL)
  {
    return "";
  }
  bool file_still_unprocessed=true;   
  if (D64File::isCompatible(filename)) {    
    try{
      printf("try to build D64File\n");
/*      D64File d64 = D64File(blob, len);
      auto disk = std::make_unique<Disk>(d64);
      printf("isD64\n");  
      wrapper->emu->drive8.insertDisk(std::move(disk));*/
      auto file = MediaFile::make(blob, len, FILETYPE_D64);
      wrapper->emu->drive8.insertMedia(*file, false /* wp*/);
      file_still_unprocessed=false;
    } catch(Error &exception) {
      //ErrorCode ec=exception.data;
      printf("%s\n", exception.description.c_str());
      //printf("%s\n", ErrorCodeEnum::key(ec));
    }
  }
  if (file_still_unprocessed && G64File::isCompatible(filename)) {
    try{
      printf("try to build G64File\n");
      auto file = MediaFile::make(blob, len, FILETYPE_G64);
      printf("isG64 ...\n");  
      wrapper->emu->drive8.insertMedia(*file, false /* wp*/);
      file_still_unprocessed=false;
    } catch(Error &exception) {
      printf("%s\n", exception.what());
    }
  }
  if (file_still_unprocessed && PRGFile::isCompatible(filename)) {
    try
    {
      printf("try to build PRGFile\n");
      auto file = MediaFile::make(blob, len, FILETYPE_PRG);
//      PRGFile *file = new PRGFile(blob, len);
      printf("isPRG\n");
      //wrapper->emu->flash(*file ,0);
      wrapper->emu->c64.flash(*file,0);
      printf("flash done\n");
      
      file_still_unprocessed=false;
    }
    catch(Error &exception) {
      printf("%s\n", exception.what());
    }
  }
  if (file_still_unprocessed && CRTFile::isCompatible(filename)) {
    try
    {
      printf("try to build CRTFile\n");
//      CRTFile *file = new CRTFile(blob, len);
      auto file = MediaFile::make(blob, len, FILETYPE_CRT);

      printf("isCRT\n");

//      wrapper->emu->expansionport.attachCartridge( Cartridge::makeWithCRTFile(*(wrapper->emu),*file));
//      wrapper->emu->reset(true);
      wrapper->emu->expansionPort.attachCartridge(*file, true);
      file_still_unprocessed=false;
    } 
    catch(Error &exception) {
      printf("error loading snapshot: %s\n", exception.what());
    }
  }
  if (file_still_unprocessed && TAPFile::isCompatible(filename)) {
    try
    {
      printf("try to build TAPFile\n");
      TAPFile *file = new TAPFile(blob, len);
      printf("isTAP\n");
      wrapper->emu->datasette.insertTape(*file);
      //wrapper->emu->datasette.rewind();
      wrapper->emu->put(CMD_DATASETTE_REWIND);
  //  wrapper->emu->datasette.pressPlay();
  //  wrapper->emu->datasette.pressStop();
      file_still_unprocessed=false;
    }
    catch(Error &exception) {
      printf("error loading snapshot: %s\n", exception.what());
    }
  }
  if (file_still_unprocessed && T64File::isCompatible(filename)) {
    try
    {
      printf("try to build T64File\n");
//      T64File *file = new T64File(blob, len);
      auto file = MediaFile::make(blob, len, FILETYPE_T64);
      printf("isT64\n");
      wrapper->emu->c64.flash(*file,0);
      file_still_unprocessed=false;
    }
    catch(Error &exception) {
      printf("error loading snapshot: %s\n", exception.what());
    }
  }
  if (file_still_unprocessed && Snapshot::isCompatible(filename) && extractSuffix(filename)!="rom" && extractSuffix(filename)!="bin") {
    try
    {
      printf("try to build Snapshot\n");
      auto file = MediaFile::make(blob, len, FILETYPE_SNAPSHOT);
      printf("isSnapshot\n");
      wrapper->emu->c64.loadSnapshot(*file);
      printf("Snapshot loaded\n");
      
      file_still_unprocessed=false;
    }
    catch(Error &exception) {
      printf("error loading snapshot: %s\n", exception.what());
    }
  }

  if(file_still_unprocessed)
  {
    bool wasRunnable = true;
    try { wrapper->emu->isReady(); } catch(...) { wasRunnable=false; }

    RomFile *rom = NULL;
    try
    {
      printf("try to build RomFile\n");
      rom = new RomFile(blob, len);
    }
    catch(Error &exception) {
      printf("Failed to read ROM image file %s\n", name);
      printf("%s\n", exception.description.c_str());
      return "";
    }
    
    wrapper->emu->suspend();
    try { 
      wrapper->emu->c64.flash(*rom); 
      printf("Loaded ROM image %s.\n", name);
    }  
    catch(Error &exception) { 
      printf("Failed to flash ROM image %s.\n", name);
      printf("%s\n", exception.description.c_str());
    }
    wrapper->emu->resume();


    bool is_ready_now = true;
    try { wrapper->emu->isReady(); } catch(...) { is_ready_now=false; }

    if (!wasRunnable && is_ready_now)
    {
       //wrapper->emu->putMessage(MSG_READY_TO_RUN);
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
      printf(" is ROM_TYPE_VC1541 \n");
      rom_type = "vc1541_rom";
      wrapper->emu->set(OPT_DRV_CONNECT,true, DRIVE8);
      wrapper->emu->set(OPT_DRV_POWER_SWITCH,true);
      wrapper->emu->emu->update();
      printf("------------------------------\n");
      wrapper->emu->drive8.drive->dump(Category::Config);
      printf("------------------------------\n");
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
  wrapper->emu->expansionPort.detachCartridge();
  wrapper->emu->c64.hardReset();
}


extern "C" void wasm_halt()
{
  printf("wasm_halt\n");
  wrapper->emu->pause();

      printf("emscripten_pause_main_loop() at MSG_PAUSE\n");
    paused_the_emscripten_main_loop=true;
    emscripten_pause_main_loop();
      printf("after emscripten_set_main_loop_arg() at MSG_RUN\n");

}

extern "C" void wasm_run()
{
  printf("wasm_run\n");
  
  printf("is running = %u\n",wrapper->emu->isRunning());

  wrapper->emu->run();

  if(paused_the_emscripten_main_loop)
  {
    printf("emscripten_resume_main_loop at MSG_RUN\n");
    emscripten_resume_main_loop();
  }
  else
  {
    printf("emscripten_set_main_loop_arg() at MSG_RUN\n");
    emscripten_set_main_loop_arg(draw_one_frame_into_SDL, (void *)wrapper->emu, 0, 1);
    printf("after emscripten_set_main_loop_arg() at MSG_RUN\n");

  }

}


extern "C" void wasm_press_play()
{
  printf("wasm_press_play\n");
  wrapper->emu->put(CMD_DATASETTE_PLAY);
//  wrapper->emu->datasette.datasette->pressPlay();
}
extern "C" void wasm_press_stop()
{
  printf("wasm_press_stop\n");
  wrapper->emu->put(CMD_DATASETTE_STOP);
//  wrapper->emu->datasette.datasette->pressStop();
}
extern "C" void wasm_rewind()
{
  printf("wasm_rewind\n");
  wrapper->emu->put(CMD_DATASETTE_REWIND);
//  wrapper->emu->datasette.datasette->rewind();
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
   // wrapper->emu->controlPort1.joystick.trigger(code);
    wrapper->emu->put(Cmd(CMD_JOY_EVENT, GamePadCmd(0,code)));
  }
  else if(joyport == '2')
  {
//    wrapper->emu->port2.joystick.trigger(code);
    wrapper->emu->put(Cmd(CMD_JOY_EVENT, GamePadCmd(1,code)));
  }

}

char buffer[50];
extern "C" char* wasm_sprite_info()
{
   sprintf(buffer, "%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u", 
     wrapper->emu->vicii.vicii->reg.current.sprX[0],
     wrapper->emu->vicii.vicii->reg.current.sprY[0],
     wrapper->emu->vicii.vicii->reg.current.sprX[1],
     wrapper->emu->vicii.vicii->reg.current.sprY[1],
     wrapper->emu->vicii.vicii->reg.current.sprX[2],
     wrapper->emu->vicii.vicii->reg.current.sprY[2],
     wrapper->emu->vicii.vicii->reg.current.sprX[3],
     wrapper->emu->vicii.vicii->reg.current.sprY[3],
     wrapper->emu->vicii.vicii->reg.current.sprX[4],
     wrapper->emu->vicii.vicii->reg.current.sprY[4],
     wrapper->emu->vicii.vicii->reg.current.sprX[5],
     wrapper->emu->vicii.vicii->reg.current.sprY[5],
     wrapper->emu->vicii.vicii->reg.current.sprX[6],
     wrapper->emu->vicii.vicii->reg.current.sprY[6],
     wrapper->emu->vicii.vicii->reg.current.sprX[7],
     wrapper->emu->vicii.vicii->reg.current.sprY[7]
     );  
   return buffer;
}

extern "C" void wasm_set_sid_model(unsigned SID_Model)
{
  bool wasRunning=false;
  if(wrapper->emu->isRunning()){
    wasRunning= true;
    wrapper->emu->pause();
  }
  if(SID_Model == 6581)
  {
    wrapper->emu->set(OPT_SID_REVISION, MOS_6581);
  }
  else if(SID_Model == 8580)
  {
    wrapper->emu->set(OPT_SID_REVISION, MOS_8580);  
  }
  if(wasRunning)
  {
    wrapper->emu->run();
  }
}

extern "C" void wasm_cut_layers(unsigned cut_layers)
{
//  wrapper->emu->configure(OPT_CUT_LAYERS, 0x1100 | (SPR0|SPR1|SPR2|SPR3|SPR4|SPR5|SPR6|SPR7)); 
//  printf("wasm_cut_layers(%u)",cut_layers);
  wrapper->emu->set(OPT_VICII_CUT_LAYERS, cut_layers); 
}



char json_result[1024];
extern "C" const char* wasm_rom_info()
{
  auto kernal_traits = wrapper->emu->c64.getRomTraits(ROM_TYPE_KERNAL);
  auto basic_traits = wrapper->emu->c64.getRomTraits(ROM_TYPE_BASIC);
  auto char_traits = wrapper->emu->c64.getRomTraits(ROM_TYPE_CHAR);
  auto drive_traits = wrapper->emu->c64.getRomTraits(ROM_TYPE_VC1541);


 sprintf(json_result, "{\"kernal\":\"%s\", \"basic\":\"%s\", \"charset\":\"%s\", \"has_floppy_rom\":%s, \"drive_rom\":\"%s\"}",
  kernal_traits.title,
  basic_traits.title,
  char_traits.title,
  /*drive_traits ? "true":"false"*/"false",
  drive_traits.title
  );



/*
  sprintf(json_result, "{\"kernal\":\"%s\", \"basic\":\"%s\", \"charset\":\"%s\", \"has_floppy_rom\":%s, \"drive_rom\":\"%s\"}",
  wrapper->emu->c64.hasMega65Rom(ROM_TYPE_KERNAL) ? "mega" : wrapper->emu->hasRom(ROM_TYPE_KERNAL) ? wrapper->emu->romTitle(ROM_TYPE_KERNAL).c_str(): "none", 
  wrapper->emu->hasMega65Rom(ROM_TYPE_BASIC) ? "mega" : wrapper->emu->hasRom(ROM_TYPE_BASIC) ? wrapper->emu->romTitle(ROM_TYPE_BASIC).c_str() : "none", 
  wrapper->emu->hasMega65Rom(ROM_TYPE_CHAR) ? "mega" : wrapper->emu->hasRom(ROM_TYPE_CHAR) ? wrapper->emu->romTitle(ROM_TYPE_CHAR).c_str(): "none",
  wrapper->emu->hasRom(ROM_TYPE_VC1541) ? "true":"false",
  wrapper->emu->romTitle(ROM_TYPE_VC1541).c_str()
  );
*/
//  printf("json: %s\n",  json_result);

  printf("%s, %s, %s, %s\n",  kernal_traits.title,
  basic_traits.title,
  char_traits.title,
  drive_traits.title
);
  return json_result;
}


extern "C" void wasm_set_2nd_sid(long address)
{
  if(address == 0)
  {
    wrapper->emu->set(OPT_AUD_VOL1, 1, 0);
    wrapper->emu->set(OPT_SID_ENABLE, 1, false);
  }
  else
  {
    wrapper->emu->set(OPT_AUD_VOL1, 1, 100);
    wrapper->emu->set(OPT_AUD_PAN1, 1, 50);
    wrapper->emu->set(OPT_SID_ENABLE, 1, true);
    wrapper->emu->set(OPT_SID_ADDRESS, 1, address);
  }
}


extern "C" void wasm_set_sid_engine(char* engine)
{
  printf("wasm_set_sid_engine %s\n", engine);

  bool wasRunning=false;
  if(wrapper->emu->isRunning()){
    wasRunning= true;
    wrapper->emu->pause();
  }


  if( strcmp(engine,"ReSID fast") == 0)
  { 
    printf("emu->set(OPT_SID_SAMPLING, SID_SAMPLE_FAST);\n");
    wrapper->emu->set(OPT_SID_ENGINE, SIDENGINE_RESID);
    wrapper->emu->set(OPT_SID_SAMPLING, reSID::SAMPLE_FAST);
  }
  else if( strcmp(engine,"ReSID interpolate") == 0)
  {
    printf("emu->set(OPT_SID_SAMPLING, SID_SAMPLE_INTERPOLATE);\n");
    wrapper->emu->set(OPT_SID_ENGINE, SIDENGINE_RESID);
    wrapper->emu->set(OPT_SID_SAMPLING, reSID::SAMPLE_INTERPOLATE);
  }
  else if( strcmp(engine,"ReSID resample") == 0)
  {
    printf("emu->set(OPT_SID_SAMPLING, SID_SAMPLE_RESAMPLE);\n");
    wrapper->emu->set(OPT_SID_ENGINE, SIDENGINE_RESID);
    wrapper->emu->set(OPT_SID_SAMPLING, reSID::SAMPLE_RESAMPLE);
  }


  if(wasRunning)
  {
    wrapper->emu->run();
  }

}


extern "C" void wasm_set_color_palette(char* palette)
{

  if( strcmp(palette,"color") == 0)
  {
    wrapper->emu->set(OPT_MON_PALETTE, PALETTE_COLOR);
  }
  else if( strcmp(palette,"black white") == 0)
  { 
    wrapper->emu->set(OPT_MON_PALETTE, PALETTE_BLACK_WHITE); 
  }
  else if( strcmp(palette,"paper white") == 0)
  { 
    wrapper->emu->set(OPT_MON_PALETTE, PALETTE_PAPER_WHITE); 
  }
  else if( strcmp(palette,"green") == 0)
  { 
    wrapper->emu->set(OPT_MON_PALETTE, PALETTE_GREEN); 
  }
  else if( strcmp(palette,"amber") == 0)
  { 
    wrapper->emu->set(OPT_MON_PALETTE, PALETTE_AMBER); 
  }
  else if( strcmp(palette,"sepia") == 0)
  { 
    wrapper->emu->set(OPT_MON_PALETTE, PALETTE_SEPIA); 
  }
}


extern "C" u64 wasm_get_cpu_cycles()
{
  return wrapper->emu->cpu.getInfo().cycle;
}

extern "C" u8 wasm_peek(u16 addr)
{
  return wrapper->emu->mem.mem->spypeek(addr);
}


extern "C" void wasm_write_string_to_ser(char* chars_to_send)
{
  #ifdef TODO
  wrapper->emu->write_string_to_ser(chars_to_send);
  #endif
}

//const char chars_to_send[] = "HELLOMYWORLD!";
extern "C" void wasm_poke(u16 addr, u8 value)
{
    wrapper->emu->mem.mem->poke(addr, value);
    wrapper->emu->c64.c64->markAsDirty(); 
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

extern "C" unsigned wasm_get_config(char* option)
{
 // if(strcmp(option,"OPT_VIC_REVISION") == 0)
  //{
#ifdef TODO
try{
  printf("before\n");

    return wrapper->emu->get(OPT_VICII_REVISION);
} catch(...)
{
  printf("catched\n");

//  printf("config: %s\n",exception.what());
}
  printf("after catching\n");
#endif
  //}
  return 0;
}

extern "C" void wasm_configure(char* option, unsigned on)
{
  bool on_value = (on == 1);

  printf("wasm_configure %s = %d\n", option, on);

  if(strcmp(option,"OPT_DRV_POWER_SAVE") == 0)
  {
    printf("calling c64->configure %s = %d\n", option, on);
    wrapper->emu->set(OPT_DRV_POWER_SAVE, 8, on_value);
  }
  else if(strcmp(option,"OPT_SID_POWER_SAVE") == 0)
  {
    printf("calling c64->configure %s = %d\n", option, on);
    wrapper->emu->set(OPT_SID_POWER_SAVE, on_value);
  }
  else if(strcmp(option,"OPT_VIC_POWER_SAVE") == 0)
  {
    printf("calling c64->configure %s = %d\n", option, on);
    wrapper->emu->set(OPT_VICII_POWER_SAVE, on_value);
  }
  else if(strcmp(option,"OPT_SER_SPEED") == 0)
  {
    printf("calling c64->configure_rs232_ser_speed %d\n", on);
   #ifdef TODO
    wrapper->emu->configure_rs232_ser_speed(on);
    #endif
  }
  else if(strcmp(option,"PAL 50Hz 6569") == 0)
  {
    wrapper->emu->set(OPT_POWER_GRID,   GRID_STABLE_50HZ);
    wrapper->emu->set(OPT_VICII_REVISION, VICII_PAL_6569_R1);
    calculate_viewport();
  }
  else if(strcmp(option,"PAL 50Hz 6569 R3") == 0)
  {
    wrapper->emu->set(OPT_POWER_GRID,   GRID_STABLE_50HZ);
    wrapper->emu->set(OPT_VICII_REVISION, VICII_PAL_6569_R3);
    calculate_viewport();
  }
  else if(strcmp(option,"PAL 50Hz 8565") == 0)
  {
    wrapper->emu->set(OPT_POWER_GRID,   GRID_STABLE_50HZ);
    wrapper->emu->set(OPT_VICII_REVISION, VICII_PAL_8565);
    calculate_viewport();
  }
  else if(strcmp(option,"NTSC 60Hz 6567 R56A") == 0)
  {
    wrapper->emu->set(OPT_POWER_GRID,   GRID_STABLE_60HZ);
    wrapper->emu->set(OPT_VICII_REVISION, VICII_NTSC_6567_R56A);
    calculate_viewport();
  }
  else if(strcmp(option,"NTSC 60Hz 6567") == 0)
  {
    wrapper->emu->set(OPT_POWER_GRID,   GRID_STABLE_60HZ);
    wrapper->emu->set(OPT_VICII_REVISION, VICII_NTSC_6567);
    calculate_viewport();
  }
  else if(strcmp(option,"NTSC 60Hz 8562") == 0)
  {
    wrapper->emu->set(OPT_POWER_GRID,   GRID_STABLE_60HZ);
    wrapper->emu->set(OPT_VICII_REVISION, VICII_NTSC_8562);
    calculate_viewport();
  }
/*  else if(strcmp(option,"freset") == 0)
  {
    wrapper->emu->configure(OPT_POWER_GRID,   GRID_STABLE_50HZ);
    frame_rate = 50.125;//
    EM_ASM({PAL_VIC=true});
    requested_targetFrameCount_reset=true;
  }*/
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
//    wrapper->emu->muxer.setSampleRate(sample_rate);
    wrapper->emu->set(OPT_HOST_SAMPLE_RATE,sample_rate);
    auto got_sample_rate=wrapper->emu->get(OPT_HOST_SAMPLE_RATE);
    printf("paula.muxer.getSampleRate()==%ld\n", got_sample_rate);
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
    want.userdata = wrapper->emu;   //will be passed to the callback
    audio_device_id = SDL_OpenAudioDevice(NULL, 0, &want, &have, SDL_AUDIO_ALLOW_FORMAT_CHANGE);
    if(audio_device_id == 0)
    {
        printf("Failed to open audio: %s\n", SDL_GetError());
    }

    printf("set SID to freq= %d\n", have.freq);
    wrapper->emu->set(OPT_HOST_SAMPLE_RATE,have.freq);
   // wrapper->emu->muxer.setSampleRate(have.freq);
    printf("freq in SIDBridge= %f\n",  wrapper->emu->get(OPT_HOST_SAMPLE_RATE));
 

    SDL_PauseAudioDevice(audio_device_id, 0); //unpause the audio device
}