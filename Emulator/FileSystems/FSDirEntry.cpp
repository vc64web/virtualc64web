// -----------------------------------------------------------------------------
// This file is part of VirtualC64
//
// Copyright (C) Dirk W. Hoffmann. www.dirkwhoffmann.de
// Licensed under the GNU General Public License v3
//
// See https://www.gnu.org for license information
// -----------------------------------------------------------------------------

#include "config.h"
#include "FSDirEntry.h"
#include "C64.h"
#include "MemUtils.h"

void
FSDirEntry::init(PETName<16> name, TSLink ref, isize numBlocks)
{
    fileType        = 0x82;  // PRG
    firstDataTrack  = (u8)ref.t;
    firstDataSector = (u8)ref.s;
    fileSizeLo      = LO_BYTE(numBlocks);
    fileSizeHi      = HI_BYTE(numBlocks);

    name.write(fileName);
}

void
FSDirEntry::init(const string &name, TSLink ref, isize numBlocks)
{
    auto petName = PETName<16>(name);
    init(petName, ref, numBlocks);
}

bool
FSDirEntry::isEmpty() const
{
    return util::isZero(&fileType, 30);
}

const string
FSDirEntry::typeString() const
{
    switch (fileType) {
            
        case 0x80: return "DEL";
        case 0x81: return "SEQ";
        case 0x82: return "PRG";
        case 0x83: return "USR";
        case 0x84: return "REL";
            
        case 0x01: return "*SEQ";
        case 0x02: return "*PRG";
        case 0x03: return "*USR";
            
        case 0xA0: return "DEL";
        case 0xA1: return "SEQ";
        case 0xA2: return "PRG";
        case 0xA3: return "USR";
            
        case 0xC0: return "DEL <";
        case 0xC1: return "SEQ <";
        case 0xC2: return "PRG <";
        case 0xC3: return "USR <";
        case 0xC4: return "REL <";
    }

    return "";
}

bool
FSDirEntry::isHidden() const
{
    return typeString() == "";
}

FSFileType
FSDirEntry::getFileType() const
{
    return (FSFileType)(fileType & 0b111);
}

