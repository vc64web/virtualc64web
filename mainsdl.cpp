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

/**
 * USE_SDL_2_PIXEL more compatible
 * USE_SDL_2_TEXTURE more efficient, draws via webgl into gpu
 */
//#define USE_SDL_2_PIXEL 1
#define USE_SDL_2_TEXTURE 1


/* SDL2 start*/
SDL_Window * window;
SDL_Surface * window_surface;
unsigned int * pixels;

SDL_Renderer * renderer;
SDL_Texture * screen_texture;

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

int emu_width  = NTSC_PIXELS;
int emu_height = PAL_RASTERLINES;
int bFullscreen = false;
int xOff = 0;
int yOff = 0;
int hOff = 0; //emu_height;
int wOff = 0; //emu_width;


EM_BOOL emscripten_window_resized_callback(int eventType, const void *reserved, void *userData){
/*
	double width, height;
	emscripten_get_element_css_size("canvas", &width, &height);
	int w = (int)width, h = (int)height;
*/
  // resize SDL window
    SDL_SetWindowSize(window, emu_width, emu_height);
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

extern "C" void toggleFullscreen()
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

int eventFilter(void* userdata, SDL_Event* event) {
    switch(event->type){
      case SDL_WINDOWEVENT:
        PrintEvent(event);
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
            toggleFullscreen();
        }
        switch(event->key.keysym.sym)
        {
            case SDLK_DOWN:
              yOff += 1;
              break;
            case SDLK_UP:
              yOff -= 1;
              break;
            case SDLK_RIGHT:
              xOff += 1;
              break;
            case SDLK_LEFT:
              xOff -= 1;
              break;

        }
        if ( event->key.keysym.sym == SDLK_w)
        {
             wOff += (event->key.keysym.mod & KMOD_LSHIFT)? -2: 2;
        }
        if ( event->key.keysym.sym == SDLK_h)
        {
             hOff += (event->key.keysym.mod & KMOD_LSHIFT)? -2: 2;
        }
        break;
      case SDL_FINGERDOWN:
      case SDL_MOUSEBUTTONDOWN:
        printf("pos: ");
        printf("x=%d, y=%d, w=%d, h=%d\n", xOff, yOff, wOff, hOff);
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

// The emscripten "main loop" replacement function.

void draw_one_frame_into_SDL2_Pixel(void *thisC64) {
  C64 *c64 = (C64 *)thisC64;
  c64->executeOneFrame();

  void *texture = c64->vic.screenBuffer();

  int surface_width = window_surface->w;
  int surface_height = window_surface->h;
  
  for (int row = 0; row < emu_height; row++) {
    for (int col = 0; col < emu_width; col++) {
      Uint32 rgba = *(((Uint32*)texture) + row * emu_width + col); 
      int a= (rgba>>24) & 0xff;
      int b= (rgba>>16) & 0xff;
      int g= (rgba>>8) & 0xff;
      int r= rgba & 0xff;
      
      *((Uint32*)pixels + row * surface_width + col) = SDL_MapRGBA(window_surface->format, r, g, b, a);
    }
  }
  SDL_UpdateWindowSurface(window);
}


// The emscripten "main loop" replacement function.
void draw_one_frame_into_SDL2_Texture(void *thisC64) {
  C64 *c64 = (C64 *)thisC64;
  c64->executeOneFrame();

  void *texture = c64->vic.screenBuffer();

  int surface_width = window_surface->w;
  int surface_height = window_surface->h;
 
  SDL_RenderClear(renderer);
  SDL_UpdateTexture(screen_texture, NULL, texture, emu_width * 4);

/*
  SDL_Rect SrcR;
  SrcR.x = 0;
  SrcR.y = 0;
  SrcR.w = emu_width;
  SrcR.h = emu_height;

  SDL_Rect DestR;

  DestR.x = 0;
  DestR.y = 0;
  DestR.w = surface_width;
  DestR.h = surface_height;
*/
//  SDL_RenderSetViewport(renderer, &SrcR); done now in resize_callback

//  SDL_RenderCopy(renderer, screen_texture, &SrcR, &SrcR);
  SDL_RenderCopy(renderer, screen_texture, NULL, NULL);
//  SDL_RenderCopy(renderer, screen_texture, &SrcR, &DestR);

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
    if(frame_count == 60*3)
    {
//        c64->flash(AnyArchive::makeWithFile("roms/octopusinredwine.prg"),0);
        //c64->VC1541.insertDisk(AnyArchive::makeWithFile("roms/fa.g64"),0);
    }
    if(frame_count == 60*4)
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

    if(filename!= NULL)
    {
      frame_count++;
    }
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
        emu_width, emu_height,
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
  SDL_SetWindowMinimumSize(window, emu_width, emu_height);
  SDL_RenderSetLogicalSize(renderer, emu_width, emu_height); 
  SDL_RenderSetIntegerScale(renderer, SDL_TRUE);

  screen_texture = SDL_CreateTexture(renderer,
        SDL_PIXELFORMAT_ABGR8888
        , SDL_TEXTUREACCESS_STREAMING,
        emu_width, emu_height);

 #endif

  
}

void theListener(const void *, int type, long data){
    printf("vC64 message=%s, data=%ld\n", msg_code[type].c_str(), data); 
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

C64Wrapper *wrapper = NULL;
extern "C" int main(int argc, char** argv) {
  wrapper= new C64Wrapper();
 
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

extern "C" void loadFile(char* name, Uint8 *blob, long len)
{
  printf("load file=%s len=%ld\n", name, len);
  filename=name;
  if(wrapper == NULL)
  {
    return;
  }
  if (checkFileSuffix(name, ".D64") || checkFileSuffix(name, ".d64")) {
    printf("isD64\n");
    //wrapper->c64->flash(D64File::makeWithBuffer(blob, len),0);
    wrapper->c64->drive1.insertDisk(D64File::makeWithBuffer(blob, len));
  }
  else if (checkFileSuffix(name, ".G64") || checkFileSuffix(name, ".g64")) {
    printf("isG64\n");
    wrapper->c64->drive1.insertDisk(G64File::makeWithBuffer(blob, len));
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

  frame_count=0;
}
