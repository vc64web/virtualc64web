/*!
 * @file        SIDBridge.cpp
 * @author      Dirk W. Hoffmann, www.dirkwhoffmann.de
 * @copyright   Dirk W. Hoffmann. All rights reserved.
 */
/*
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 */

#include "C64.h"

SIDBridge::SIDBridge()
{
	setDescription("SIDBridge");
    
    fastsid.bridge = this;
    resid.bridge = this;
    
    // Register sub components
    VirtualComponent *subcomponents[] = { &resid, &fastsid, NULL };
    registerSubComponents(subcomponents, sizeof(subcomponents));

    // Register snapshot items
    SnapshotItem items[] = {
        
        // Configuration items
        { &useReSID,        sizeof(useReSID),       KEEP_ON_RESET },

        // Internal state
        { &cycles,          sizeof(cycles),         CLEAR_ON_RESET },
        { NULL,             0,                      0 }};
    
    registerSnapshotItems(items, sizeof(items));
    
    useReSID = true;
}

SIDBridge::~SIDBridge()
{
}

void
SIDBridge::reset()
{
    VirtualComponent::reset();

    clearRingbuffer();
    resid.reset();
    fastsid.reset();
    
    volume = 100000;
    targetVolume = 100000;
}

void
SIDBridge::setClockFrequency(uint32_t frequency)
{
    debug("Setting clock frequency to %d\n", frequency);
    resid.setClockFrequency(frequency);
    fastsid.setClockFrequency(frequency);
}

void 
SIDBridge::setReSID(bool enable)
{
    useReSID = enable;
}

void
SIDBridge::dump(SIDInfo info)
{
    uint8_t ft = info.filterType;
    msg("        Volume: %d\n", info.volume);
    msg("   Filter type: %s\n",
        (ft == FASTSID_LOW_PASS) ? "LOW PASS" :
        (ft == FASTSID_HIGH_PASS) ? "HIGH PASS" :
        (ft == FASTSID_BAND_PASS) ? "BAND PASS" : "NONE");
    msg("Filter cut off: %d\n\n", info.filterCutoff);
    msg("Filter resonance: %d\n\n", info.filterResonance);
    msg("Filter enable bits: %d\n\n", info.filterEnableBits);

    for (unsigned i = 0; i < 3; i++) {
        VoiceInfo vinfo = getVoiceInfo(i);
        uint8_t wf = vinfo.waveform;
        msg("Voice %d:       Frequency: %d\n", i, vinfo.frequency);
        msg("             Pulse width: %d\n", vinfo.pulseWidth);
        msg("                Waveform: %s\n",
            (wf == FASTSID_NOISE) ? "NOISE" :
            (wf == FASTSID_PULSE) ? "PULSE" :
            (wf == FASTSID_SAW) ? "SAW" :
            (wf == FASTSID_TRIANGLE) ? "TRIANGLE" : "NONE");
        msg("         Ring modulation: %s\n", vinfo.ringMod ? "yes" : "no");
        msg("               Hard sync: %s\n", vinfo.hardSync ? "yes" : "no");
        msg("             Attack rate: %d\n", vinfo.attackRate);
        msg("              Decay rate: %d\n", vinfo.decayRate);
        msg("            Sustain rate: %d\n", vinfo.sustainRate);
        msg("            Release rate: %d\n", vinfo.releaseRate);
    }
}

void 
SIDBridge::dump()
{
    msg("ReSID:\n");
    msg("------\n");
    dump(resid.getInfo());

    msg("FastSID:\n");
    msg("--------\n");
    msg("    Chip model: %s\n",
        (fastsid.getModel() == MOS_6581) ? "6581" :
        (fastsid.getModel() == MOS_8580) ? "8580" : "???");
    msg(" Sampling rate: %d\n", fastsid.getSampleRate());
    msg(" CPU frequency: %d\n", fastsid.getClockFrequency());
    msg("Emulate filter: %s\n", fastsid.getAudioFilter() ? "yes" : "no");
    msg("\n");
    dump(fastsid.getInfo());
    
    resid.sid->voice[0].wave.reset(); // reset_shift_register();
    resid.sid->voice[1].wave.reset(); // reset_shift_register();
    resid.sid->voice[2].wave.reset(); // reset_shift_register();
    resid.sid->voice[0].envelope.reset();
    resid.sid->voice[1].envelope.reset();
    resid.sid->voice[2].envelope.reset();
}

SIDInfo
SIDBridge::getInfo()
{
    SIDInfo info = useReSID ? resid.getInfo() : fastsid.getInfo();
    info.potX = c64->mouse.readPotX();
    info.potY = c64->mouse.readPotY();
    return info;
}

VoiceInfo
SIDBridge::getVoiceInfo(unsigned voice)
{
    return useReSID ? resid.getVoiceInfo(voice) : fastsid.getVoiceInfo(voice);
}

uint8_t 
SIDBridge::peek(uint16_t addr)
{
    assert(addr <= 0x1F);
    
    // Get SID up to date
    executeUntil(c64->cpu.cycle);
    
    if (addr == 0x19) {
        return c64->mouse.readPotX();
    }
    if (addr == 0x1A) {
        return c64->mouse.readPotY();
    }
    
    if (useReSID) {
        return resid.peek(addr);
    } else {
        return fastsid.peek(addr);
    }
}

uint8_t
SIDBridge::spypeek(uint16_t addr)
{
    assert(addr <= 0x1F);
    return peek(addr);
}

void 
SIDBridge::poke(uint16_t addr, uint8_t value)
{
    // Get SID up to date
    executeUntil(c64->cpu.cycle);

    // Keep both SID implementations up to date
    resid.poke(addr, value);
    fastsid.poke(addr, value);
    
    // Run ReSID for at least one cycle to make pipelined writes work
    if (!useReSID) resid.clock();
}

void
SIDBridge::executeUntil(uint64_t targetCycle)
{
    uint64_t missingCycles = targetCycle - cycles;
    
    if (missingCycles > PAL_CYCLES_PER_SECOND) {
        debug("Far too many SID cycles are missing.\n");
        missingCycles = PAL_CYCLES_PER_SECOND;
    }
    
    execute(missingCycles);
    cycles = targetCycle;
}

void
SIDBridge::execute(uint64_t numCycles)
{
    // debug("Execute SID for %lld cycles (%d samples in buffer)\n", numCycles, samplesInBuffer());
    if (numCycles == 0)
        return;
    
    if (useReSID) {
        resid.execute(numCycles);
    } else {
        fastsid.execute(numCycles);
    }
}

void 
SIDBridge::run()
{
    clearRingbuffer();
}

void 
SIDBridge::halt()
{
    clearRingbuffer();
}

bool
SIDBridge::getAudioFilter()
{
    if (useReSID) {
        return resid.getAudioFilter();
    } else {
        return fastsid.getAudioFilter();
    }
}

void 
SIDBridge::setAudioFilter(bool value)
{
    resid.setAudioFilter(value);
    fastsid.setAudioFilter(value);
}

SamplingMethod
SIDBridge::getSamplingMethod()
{
    // Option is ReSID only
    return resid.getSamplingMethod();
}

void
SIDBridge::setSamplingMethod(SamplingMethod value)
{
    // Option is ReSID only
    resid.setSamplingMethod(value);
}

SIDModel
SIDBridge::getModel()
{
    if (useReSID) {
        return resid.getModel();
    } else {
        return fastsid.getModel();
    }
}

void 
SIDBridge::setModel(SIDModel m)
{
    if (m != MOS_6581 && m != MOS_8580) {
        warn("Unknown SID model (%d). Using  MOS8580\n", m);
        m = MOS_8580;
    }
    
    suspend();
    resid.setModel(m);
    fastsid.setModel(m);
    resume();
}

uint32_t
SIDBridge::getSampleRate()
{
    if (useReSID) {
        return resid.getSampleRate();
    } else {
        return fastsid.getSampleRate();
    }
}

void 
SIDBridge::setSampleRate(uint32_t rate)
{
    debug("Changing sample rate from %d to %d\n", getSampleRate(), rate);
    resid.setSampleRate(rate);
    fastsid.setSampleRate(rate);
}

uint32_t
SIDBridge::getClockFrequency()
{
    if (useReSID) {
        return resid.getClockFrequency();
    } else {
        return fastsid.getClockFrequency();
    }
}

void
SIDBridge::clearRingbuffer()
{
    debug(4,"Clearing ringbuffer\n");
    
    // Reset ringbuffer contents
    for (unsigned i = 0; i < bufferSize; i++) {
        ringBuffer[i] = 0.0f;
    }
    
    // Put the write pointer ahead of the read pointer
    alignWritePtr();
}

float
SIDBridge::readData()
{
    // Read sound sample
    float value = ringBuffer[readPtr];
    
    // Adjust volume
    if (volume != targetVolume) {
        if (volume < targetVolume) {
            volume += MIN(volumeDelta, targetVolume - volume);
        } else {
            volume -= MIN(volumeDelta, volume - targetVolume);
        }
    }
    // float divider = 75000.0f; // useReSID ? 100000.0f : 150000.0f;
    float divider = 40000.0f;
    value = (volume <= 0) ? 0.0f : value * (float)volume / divider;
    
    // Advance read pointer
    advanceReadPtr();
    
    return value;
}

float
SIDBridge::ringbufferData(size_t offset)
{
    return ringBuffer[(readPtr + offset) % bufferSize];
}

void
SIDBridge::readMonoSamples(float *target, size_t n)
{
    // Check for buffer underflow
    if (samplesInBuffer() < n) {
        handleBufferUnderflow();
    }
    
    // Read samples
    for (size_t i = 0; i < n; i++) {
        float value = readData();
        target[i] = value;
    }
}

void
SIDBridge::readStereoSamples(float *target1, float *target2, size_t n)
{
    // debug("read: %d write: %d Reading %d\n", readPtr, writePtr, n);

    // Check for buffer underflow
    if (samplesInBuffer() < n) {
        handleBufferUnderflow();
    }
    
    // Read samples
    for (unsigned i = 0; i < n; i++) {
        float value = readData();
        target1[i] = target2[i] = value;
    }
}

void
SIDBridge::readStereoSamplesInterleaved(float *target, size_t n)
{
    // Check for buffer underflow
    if (samplesInBuffer() < n) {
        handleBufferUnderflow();
    }
    
    // Read samples
    for (unsigned i = 0; i < n; i++) {
        float value = readData();
        target[i*2] = value;
        target[i*2+1] = value;
    }
}

void
SIDBridge::writeData(short *data, size_t count)
{
    // debug("  read: %d write: %d Writing %d (%d)\n", readPtr, writePtr, count, bufferCapacity());
    
    // Check for buffer overflow
    if (bufferCapacity() < count) {
        handleBufferOverflow();
    }
    
    // Convert sound samples to floating point values and write into ringbuffer
    for (unsigned i = 0; i < count; i++) {
        ringBuffer[writePtr] = float(data[i]) * scale;
        advanceWritePtr();
    }
}


extern long xmachtime();

void
SIDBridge::handleBufferUnderflow()
{
    // There are two common scenarios in which buffer underflows occur:
    //
    // (1) The consumer runs slightly faster than the producer.
    // (2) The producer is halted or not startet yet.
    
    debug(2, "SID RINGBUFFER UNDERFLOW (r: %ld w: %ld)\n", readPtr, writePtr);

    // Determine the elapsed seconds since the last pointer adjustment.
    uint64_t now = xmachtime(); //mach_absolute_time();
    double elapsedTime = (double)(now - lastAlignment) / 1000000000.0;
    lastAlignment = now;

    // Adjust the sample rate, if condition (1) holds.
    if (elapsedTime > 10.0) {
        
        bufferUnderflows++;
        
        // Increase the sample rate based on what we've measured.
        int offPerSecond = (int)(samplesAhead / elapsedTime);
        setSampleRate(getSampleRate() + offPerSecond);
    }

    // Reset the write pointer
    alignWritePtr();
}

void
SIDBridge::handleBufferOverflow()
{
    // There are two common scenarios in which buffer overflows occur:
    //
    // (1) The consumer runs slightly slower than the producer.
    // (2) The consumer is halted or not startet yet.
    
    debug(2, "SID RINGBUFFER OVERFLOW (r: %ld w: %ld)\n", readPtr, writePtr);
    
    // Determine the elapsed seconds since the last pointer adjustment.
    uint64_t now = xmachtime(); //mach_absolute_time();
    double elapsedTime = (double)(now - lastAlignment) / 1000000000.0;
    lastAlignment = now;
    
    // Adjust the sample rate, if condition (1) holds.
    if (elapsedTime > 10.0) {
        
        bufferOverflows++;
        
        // Decrease the sample rate based on what we've measured.
        int offPerSecond = (int)(samplesAhead / elapsedTime);
        setSampleRate(getSampleRate() - offPerSecond);
    }
    
    // Reset the write pointer
    alignWritePtr();
}
