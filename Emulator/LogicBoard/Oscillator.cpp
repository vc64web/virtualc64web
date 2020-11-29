// -----------------------------------------------------------------------------
// This file is part of VirtualC64
//
// Copyright (C) Dirk W. Hoffmann. www.dirkwhoffmann.de
// Licensed under the GNU General Public License v2
//
// See https://www.gnu.org for license information
// -----------------------------------------------------------------------------

#include "C64.h"


#ifdef __EMSCRIPTEN__    
#include <emscripten.h>
#endif

Oscillator::Oscillator(C64& ref) : C64Component(ref)
{
    setDescription("Oscillator");
    
#ifdef __MACH__
    mach_timebase_info(&tb);
#endif
}

/*
const char *
Oscillator::getDescription()
{
#ifdef __MACH__
    return "Oscillator (Mac)";
#else
    return "Oscillator (Generic)";
#endif
}
*/

void
Oscillator::_reset()
{
    RESET_SNAPSHOT_ITEMS
}

u64
Oscillator::nanos()
{
#ifdef __MACH__
    
    return abs_to_nanos(mach_absolute_time());

#elif __EMSCRIPTEN__
    return (uint64_t)(emscripten_get_now()*1000000.0);
#else
    
    struct timespec ts;
    (void)clock_gettime(CLOCK_MONOTONIC, &ts);
    return ts.tv_sec * 1000000000 + ts.tv_nsec;
    
#endif
}

void
Oscillator::restart()
{
    clockBase = cpu.cycle;
    timeBase = nanos();
}

void
Oscillator::synchronize()
{
    // Only proceed if we are not running in warp mode
    if (warpMode) return;
    
    u64 now          = nanos();
    Cycle clockDelta = cpu.cycle - clockBase;
    u64 elapsedTime  = (u64)(clockDelta * 1000 * 1000000 /  vic.getFrequency());
    u64 targetTime   = timeBase + elapsedTime;
    
    /*
    debug("now         = %lld\n", now);
    debug("clockDelta  = %lld\n", clockDelta);
    debug("elapsedTime = %lld\n", elapsedTime);
    debug("targetTime  = %lld\n", targetTime);
    debug("\n");
    */
    
    // Check if we're running too slow ...
    if (now > targetTime) {
        
        // Check if we're completely out of sync ...
        if (now - targetTime > 200000000) {
            
            // warn("The emulator is way too slow (%lld).\n", now - targetTime);
            restart();
            return;
        }
    }
    
    // Check if we're running too fast ...
    if (now < targetTime) {
        
        // Check if we're completely out of sync ...
        if (targetTime - now > 200000000) {
            
            warn("The emulator is way too fast (%lld).\n", targetTime - now);
            restart();
            return;
        }
        
        // See you soon...
        waitUntil(targetTime);
        // mach_wait_until(targetTime);
    }
}

void
Oscillator::waitUntil(u64 deadline)
{
#ifdef __MACH__
    
    mach_wait_until(deadline);
    
#else

    assert(false);
    // TODO: MISSING IMPLEMENTATION
    
#endif
}

#ifdef __MACH__
mach_timebase_info_data_t Oscillator::tb;
#endif
