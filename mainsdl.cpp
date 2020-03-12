// Copyright 2011 The Emscripten Authors.  All rights reserved.
// Emscripten is available under two separate licenses, the MIT license and the
// University of Illinois/NCSA Open Source License.  Both these licenses can be
// found in the LICENSE file.

#include <stdio.h>
#include "C64.h"
#include "C64_types.h"
#include "msg_codes.h"


#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif


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
  wrapper->run();
  return 0;
}