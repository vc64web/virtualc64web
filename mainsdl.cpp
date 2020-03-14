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

/**
 * USE_SDL_2_PIXEL more compatible
 * USE_SDL_2_TEXTURE more efficient, draws via webgl into gpu
 */
#define USE_SDL_2_PIXEL 1
//#define USE_SDL_2_TEXTURE 1

int eventFilter(void* userdata, SDL_Event* event) {

    switch(event->type){
      case SDL_KEYDOWN:
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
    }
    return 1;
}

// The emscripten "main loop" replacement function.

/* SDL2 start*/
SDL_Window * window;
SDL_Surface * window_surface;
unsigned int * pixels;

SDL_Renderer * renderer;
SDL_Texture * screen_texture;

/* SDL2 end */

void draw_one_frame_into_SDL2_Pixel(void *thisC64) {
  C64 *c64 = (C64 *)thisC64;
  c64->executeOneFrame();

  void *texture = c64->vic.screenBuffer();

  int twidth = NTSC_PIXELS;
  int theight = PAL_RASTERLINES;

  int width = window_surface->w;
  int height = window_surface->h;

  
  for (int row = 0; row < theight; row++) {
    for (int col = 0; col < twidth; col++) {
      Uint32 rgba = *(((Uint32*)texture) + row * twidth + col); 
      int a= (rgba>>24) & 0xff;
      int b= (rgba>>16) & 0xff;
      int g= (rgba>>8) & 0xff;
      int r= rgba & 0xff;
      
      *((Uint32*)pixels + row * twidth + col) = SDL_MapRGBA(window_surface->format, r, g, b, a);
    }
  }
  SDL_UpdateWindowSurface(window);
}


// The emscripten "main loop" replacement function.
void draw_one_frame_into_SDL2_Texture(void *thisC64) {
  C64 *c64 = (C64 *)thisC64;
  c64->executeOneFrame();

  void *texture = c64->vic.screenBuffer();

  int width = NTSC_PIXELS;
  int height = PAL_RASTERLINES;

  // It's a good idea to clear the screen every frame,
    // as artifacts may occur if the window overlaps with
    // other windows or transparent overlays.
  SDL_RenderClear(renderer);
  SDL_UpdateTexture(screen_texture, NULL, texture, width * 4);
  SDL_RenderCopy(renderer, screen_texture, NULL, NULL);
  SDL_RenderPresent(renderer);

}


unsigned long frame_count=0;
void draw_one_frame_into_SDL(void *thisC64) {
    
    #ifdef USE_SDL_2_PIXEL
        draw_one_frame_into_SDL2_Pixel(thisC64);
    #endif
    #ifdef USE_SDL_2_TEXTURE
        draw_one_frame_into_SDL2_Texture(thisC64);
    #endif

    C64 *c64 = (C64 *)thisC64;
    if(frame_count == 60*4)
    {
        c64->flash(AnyArchive::makeWithFile("roms/octopusinredwine.prg"),0);
        //c64->VC1541.insertDisk(AnyArchive::makeWithFile("roms/fa.g64"),0);
    }
    if(frame_count == 60*5)
    {
        c64->keyboard.pressKey(2, 1); //r
    }
    if(frame_count == 60*6)
    {
        c64->keyboard.releaseKey(2, 1);
        c64->keyboard.pressKey(3, 6);//u
        
    }
    if(frame_count == 60*7)
    {
        c64->keyboard.releaseKey(3, 6);
        c64->keyboard.pressKey(4, 7);//n   
    }
    if(frame_count == 60*8)
    {
        c64->keyboard.releaseKey(4, 7);
        c64->keyboard.pressKey(0, 1);//Return   
    }

    if(frame_count == 60*9)
    {
        c64->keyboard.releaseKey(0, 1);
    }
    frame_count++;
    
}

void MyAudioCallback(void*  thisC64,
                       Uint8* stream,
                       int    len)
{
    C64 *c64 = (C64 *)thisC64;
    c64->sid.readMonoSamples((float *)stream,len /  sizeof(float) );
}



void initSDL(void *thisC64)
{
    C64 *c64 = (C64 *)thisC64;
    int width = NTSC_PIXELS;
    int height = PAL_RASTERLINES;

    if(SDL_Init(SDL_INIT_VIDEO|SDL_INIT_AUDIO)==-1)
    {
        printf("Could not initialize SDL:%s\n", SDL_GetError());
    } 

    SDL_AudioSpec want, have;
    SDL_AudioDeviceID device_id;

    SDL_memset(&want, 0, sizeof(want)); /* or SDL_zero(want) */
    want.freq = 44100;
    want.format = AUDIO_F32;
    want.channels = 1;
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
    SDL_SetEventFilter(eventFilter, NULL);


   window = SDL_CreateWindow("",
   SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED,
        width, height,
        SDL_WINDOW_RESIZABLE);

   #ifdef USE_SDL_2_PIXEL
  //mit Pixel
    window_surface = SDL_GetWindowSurface(window);

    pixels = (unsigned int *)window_surface->pixels;
   #endif
 
  #ifdef USE_SDL_2_TEXTURE
 
  //Texture
  renderer = SDL_CreateRenderer(window,
        -1, SDL_RENDERER_PRESENTVSYNC);
  
    // Since we are going to display a low resolution buffer,
    // it is best to limit the window size so that it cannot
    // be smaller than our internal buffer size.
  SDL_SetWindowMinimumSize(window, width, height);

  SDL_RenderSetLogicalSize(renderer, width, height); 
  SDL_RenderSetIntegerScale(renderer, SDL_TRUE);

  screen_texture = SDL_CreateTexture(renderer,
        SDL_PIXELFORMAT_ABGR8888
        , SDL_TEXTUREACCESS_STREAMING,
        width, height);

 #endif

}

void theListener(const void *, int type, long data){
    printf("incoming message=%s, data=%ld\n", msg_code[type].c_str(), data); 
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



    c64->run();
    printf("after run ...\n");
  }

};


extern "C" int main(int argc, char** argv) {
  C64Wrapper *wrapper= new C64Wrapper();
 
  initSDL(wrapper->c64);
  wrapper->run();
  return 0;
}

/* emulation of macos mach_absolute_time() function. */
long mach_absolute_time()
{
    auto xnow = std::chrono::system_clock::now();
    auto now_ns = std::chrono::time_point_cast<std::chrono::nanoseconds>(xnow);
    auto epoch = now_ns.time_since_epoch();
    auto now_ns_long = std::chrono::duration_cast<std::chrono::nanoseconds>(epoch).count();
    return now_ns_long;
}