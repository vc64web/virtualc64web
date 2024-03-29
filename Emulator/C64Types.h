// -----------------------------------------------------------------------------
// This file is part of VirtualC64
//
// Copyright (C) Dirk W. Hoffmann. www.dirkwhoffmann.de
// Licensed under the GNU General Public License v3
//
// See https://www.gnu.org for license information
// -----------------------------------------------------------------------------

#pragma once

#include "Aliases.h"
#include "Reflection.h"

//
// Enumerations
//

enum_long(C64_MODEL)
{
    C64_MODEL_PAL,
    C64_MODEL_PAL_II,
    C64_MODEL_PAL_OLD,
    C64_MODEL_NTSC,
    C64_MODEL_NTSC_II,
    C64_MODEL_NTSC_OLD
};
typedef C64_MODEL C64Model;

#ifdef __cplusplus
struct C64ModelEnum : util::Reflection<C64ModelEnum, C64Model> {
    
    static long min() { return 0; }
    static long max() { return C64_MODEL_NTSC_OLD; }
    static bool isValid(long value) { return value >= min() && value <= max(); }
    
    static const char *prefix() { return "C64_MODEL"; }
    static const char *key(C64Model value)
    {
        switch (value) {
                
            case C64_MODEL_PAL:       return "PAL";
            case C64_MODEL_PAL_II:    return "PAL_II";
            case C64_MODEL_PAL_OLD:   return "PAL_OLD";
            case C64_MODEL_NTSC:      return "NTSC";
            case C64_MODEL_NTSC_II:   return "NTSC_II";
            case C64_MODEL_NTSC_OLD:  return "NTSC_OLD";
        }
        return "???";
    }
};
#endif

enum_long(ROM_TYPE)
{
    ROM_TYPE_BASIC,
    ROM_TYPE_CHAR,
    ROM_TYPE_KERNAL,
    ROM_TYPE_VC1541
};
typedef ROM_TYPE RomType;

#ifdef __cplusplus
struct RomTypeEnum : util::Reflection<RomTypeEnum, RomType> {
    
    static long min() { return 0; }
    static long max() { return ROM_TYPE_VC1541; }
    static bool isValid(long value) { return value >= min() && value <= max(); }

    static const char *prefix() { return "ROM_TYPE"; }
    static const char *key(RomType value)
    {
        switch (value) {
                
            case ROM_TYPE_BASIC:   return "BASIC";
            case ROM_TYPE_CHAR:    return "CHAR";
            case ROM_TYPE_KERNAL:  return "KERNAL";
            case ROM_TYPE_VC1541:  return "VC1541";
        }
        return "???";
    }
};
#endif

enum_long(INSPECTION_TARGET)
{
    INSPECTION_NONE,
    INSPECTION_CPU,
    INSPECTION_CIA,
    INSPECTION_MEM,
    INSPECTION_VIC,
    INSPECTION_SID
};
typedef INSPECTION_TARGET InspectionTarget;

#ifdef __cplusplus
struct InspectionTargetEnum : util::Reflection<InspectionTargetEnum, InspectionTarget> {
    
    static long min() { return 0; }
    static long max() { return INSPECTION_SID; }
    static bool isValid(long value) { return value >= min() && value <= max(); }
    
    static const char *prefix() { return "INSPECTION"; }
    static const char *key(InspectionTarget value)
    {
        switch (value) {
                
            case INSPECTION_NONE:  return "NONE";
            case INSPECTION_CPU:   return "CPU";
            case INSPECTION_CIA:   return "CIA";
            case INSPECTION_MEM:   return "MEM";
            case INSPECTION_VIC:   return "VIC";
            case INSPECTION_SID:   return "SID";
        }
        return "???";
    }
};
#endif


//
// Private data types
//

#ifdef __cplusplus

typedef u32 RunLoopFlags;

namespace RL
{
constexpr u32 STOP          = 0b0000000001;
constexpr u32 INSPECT       = 0b0000000010;
constexpr u32 WARP_ON       = 0b0000000100;
constexpr u32 WARP_OFF      = 0b0000001000;
constexpr u32 BREAKPOINT    = 0b0000010000;
constexpr u32 WATCHPOINT    = 0b0000100000;
constexpr u32 AUTO_SNAPSHOT = 0b0001000000;
constexpr u32 USER_SNAPSHOT = 0b0010000000;
constexpr u32 CPU_JAM       = 0b0100000000;
constexpr u32 EXTERNAL_NMI  = 0b1000000000;
};

#endif
