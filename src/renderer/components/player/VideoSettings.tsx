import { ISubtitle } from '../../types/consumetTypes';
import {
  faClock,
  faFont,
  faGear,
  faLanguage,
  faRotateRight,
  faVideo,
  faVolumeHigh,
  faVolumeLow,
  faVolumeXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Store from 'electron-store';
import Hls from 'hls.js';
import React, {
  ChangeEvent,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import Select from '../Select';
import {
  applySubtitleStyle,
  SUBTITLE_COLOR_OPTIONS,
  SUBTITLE_SIZE_OPTIONS,
} from '../../../modules/subtitleStyle';

const STORE = new Store();

interface SettingsProps {
  show: boolean;
  onShow: (show: boolean) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  subtitleTracks?: ISubtitle[];
  onSubtitleTrack: (track: ISubtitle) => void;
  hls?: Hls;
  onChangeEpisode: (
    episode: number | null,
    reloadAtPreviousTime?: boolean,
  ) => Promise<boolean>;
}

const VideoSettings = forwardRef<HTMLDivElement, SettingsProps>(
  (
    {
      show,
      onShow,
      videoRef,
      hls,
      onChangeEpisode,
      onSubtitleTrack,
      subtitleTracks,
    },
    ref,
  ) => {
    const [hlsData, setHlsData] = useState<Hls>();
    const [audioTracks, setAudioTracks] = useState<any[]>([]);
    const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(0);
    const [watchDubbed, setWatchDubbed] = useState<boolean>(
      STORE.get('dubbed') as boolean,
    );
    const [introSkipTime, setIntroSkipTime] = useState<number>(
      STORE.get('intro_skip_time') as number,
    );
    const [skipTime, setSkipTime] = useState<number>(
      STORE.get('key_press_skip') as number,
    );
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState<number>(STORE.get('volume') as number);
    const [speed, setSpeed] = useState('1');
    const [changeEpisodeLoading, setChangeEpisodeLoading] =
      useState<boolean>(false);
    const [subtitleTrack, setSubtitleTrack] = useState<ISubtitle | undefined>();

    // useEffect(() => {
    //   console.log('show');
    // }, [show]);
    // useEffect(() => {
    //   console.log('videoRef');
    // }, [videoRef]);
    // useEffect(() => {
    //   console.log('subtitleTracks');
    // }, [subtitleTracks]);
    // useEffect(() => {
    //   console.log('hls');
    // }, [hls]);
    // useEffect(() => {
    //   console.log('onShow');
    // }, [onShow]);
    // useEffect(() => {
    //   console.log('onSubtitleTrack');
    // }, [onSubtitleTrack]);
    // useEffect(() => {
    //   console.log('onChangeEpisode');
    // }, [onChangeEpisode]);

    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.volume = volume;
      }

      const handleVideoVolumeChange = () => {
        if (videoRef.current) {
          setIsMuted(videoRef.current.muted);
          setVolume(videoRef.current.volume);
        }
      };

      const videoElement = videoRef.current;
      if (videoElement) {
        videoElement.addEventListener('volumechange', handleVideoVolumeChange);
      }

      return () => {
        if (videoElement) {
          videoElement.removeEventListener(
            'volumechange',
            handleVideoVolumeChange,
          );
        }
      };
    }, []);

    useEffect(() => {
      if (!subtitleTrack) {
        const lastUsed = STORE.get('subtitle_language') as string;
        setSubtitleTrack(
          subtitleTracks && subtitleTracks.length > 0
            ? subtitleTracks.find(
                (value) =>
                  value.lang.substring(0, lastUsed.length) ===
                  (lastUsed as string),
              ) || subtitleTracks[0]
            : undefined,
        );
      }

      setHlsData(hls);
    }, [hls]);

    // audio tracks (multi-audio streams, e.g. sub/dub or languages)
    useEffect(() => {
      if (!hls || !hls.audioTracks || hls.audioTracks.length === 0) return;
      if (!audioTracks.length) {
        setAudioTracks([...(hls.audioTracks as any[])]);
        setSelectedAudioTrack((hls as any).currentAudioGroupIndex ?? 0);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hls]);

    const handleAudioChange = (value: any) => {
      const index = value as number;
      setSelectedAudioTrack(index);
      if (hlsData) (hlsData as any).currentAudioGroupIndex = index;
    };

    const handleSubtitleSizeChange = (value: any) => {
      STORE.set('subtitle_size', value as string);
      applySubtitleStyle();
    };

    const handleSubtitleColorChange = (value: any) => {
      STORE.set('subtitle_color', value as string);
      applySubtitleStyle();
    };

    const toggleShow = useCallback(() => {
      onShow(!show);
    }, [show, onShow]);

    const handleQualityChange = useCallback(
      (index: number) => {
        if (hlsData) {
          hlsData.currentLevel = index;
        }
      },
      [hlsData],
    );

    const toggleMute = useCallback(() => {
      if (videoRef.current) {
        videoRef.current.muted = !videoRef.current.muted;
        setIsMuted(videoRef.current.muted);
        setVolume(videoRef.current.muted ? 0 : videoRef.current.volume);
      }
    }, [videoRef]);

    const handleVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(event.target.value);
      if (videoRef.current) {
        STORE.set('volume', newVolume);
        videoRef.current.volume = newVolume;
        setVolume(newVolume);
      }
    };

    const handleSpeedChange = (value: any) => {
      const speedValue = parseFloat(value);
      setSpeed(value);
      if (videoRef.current) {
        videoRef.current.playbackRate = speedValue;
      }
    };

    const handleWatchDubbedChange = async () => {
      const previous = STORE.get('dubbed');
      STORE.set('dubbed', !watchDubbed);

      setChangeEpisodeLoading(true);

      if (await onChangeEpisode(null, true)) {
        setWatchDubbed(!watchDubbed);
        setChangeEpisodeLoading(false);
      } else {
        STORE.set('dubbed', previous);
        setChangeEpisodeLoading(false);
      }
    };

    const handleIntroSkipTimeChange = (value: any) => {
      STORE.set('intro_skip_time', parseInt(value));
      setIntroSkipTime(parseInt(value));
    };

    const handleSkipTimeChange = (value: any) => {
      STORE.set('key_press_skip', parseInt(value));
      setSkipTime(parseInt(value));
    };

    const handleChangeSubtitleTrack = (value: ISubtitle) => {
      STORE.set('subtitle_language', value.lang);
      onSubtitleTrack(value);
      setSubtitleTrack(value);
    };

    return (
      <div className="settings-content">
        <button
          className={`b-player ${show ? 'active' : ''}`}
          onClick={toggleShow}
        >
          <div className="tooltip">
            <FontAwesomeIcon className="i" icon={faGear} />
            <div className="tooltip-text">Settings</div>
          </div>
        </button>
        {show && (
          <div ref={ref} className="dropdown">
            <li className="quality">
              <span>
                <FontAwesomeIcon className="i label" icon={faVideo} />
                Quality
              </span>
              {hlsData && (
                <Select
                  zIndex={13}
                  options={[
                    { label: 'Auto', value: -1 },
                    ...hlsData?.levels?.map((level, index) => ({
                      label: `${level.height}p`,
                      value: index,
                    })),
                  ]}
                  selectedValue={hlsData?.currentLevel}
                  onChange={handleQualityChange}
                  width={110}
                />
              )}
            </li>
            <li className="volume">
              <span onClick={toggleMute}>
                {isMuted ? (
                  <FontAwesomeIcon className="i label" icon={faVolumeXmark} />
                ) : volume <= 0.3 ? (
                  <FontAwesomeIcon className="i label" icon={faVolumeLow} />
                ) : (
                  <FontAwesomeIcon className="i label" icon={faVolumeHigh} />
                )}
                Volume
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
              />
            </li>
            <li className="playback">
              <span>
                <FontAwesomeIcon className="i label" icon={faClock} />
                Speed
              </span>
              <Select
                zIndex={12}
                options={[
                  { label: '0.25', value: '0.25' },
                  { label: '0.50', value: '0.50' },
                  { label: '0.75', value: '0.75' },
                  { label: '1', value: '1' },
                  { label: '1.25', value: '1.25' },
                  { label: '1.50', value: '1.50' },
                  { label: '1.75', value: '1.75' },
                  { label: '2', value: '2' },
                ]}
                selectedValue={speed}
                onChange={handleSpeedChange}
                width={100}
              />
            </li>
            <li className="skip-time">
              <span>
                <FontAwesomeIcon className="i label" icon={faRotateRight} />
                Skip Time
              </span>
              <Select
                zIndex={11}
                options={[
                  { label: '1', value: 1 },
                  { label: '2', value: 2 },
                  { label: '3', value: 3 },
                  { label: '4', value: 4 },
                  { label: '5', value: 5 },
                ]}
                selectedValue={skipTime}
                onChange={handleSkipTimeChange}
                width={100}
              />
            </li>
            {subtitleTrack && subtitleTracks && (
              <li className="subtitle-tracks">
                <span>
                  <FontAwesomeIcon className="i label" icon={faLanguage} />
                  Subtitles
                </span>
                <Select
                  zIndex={10}
                  options={subtitleTracks.map((value) => ({
                    label: value.lang,
                    value: value,
                  }))}
                  selectedValue={subtitleTrack}
                  onChange={handleChangeSubtitleTrack}
                  width={100}
                />
              </li>
            )}
            <li className="intro-skip-time">
              <span>
                <FontAwesomeIcon className="i label" icon={faRotateRight} />
                Intro Skip Time
              </span>
              <Select
                zIndex={9}
                options={[
                  { label: '60', value: 60 },
                  { label: '65', value: 65 },
                  { label: '70', value: 70 },
                  { label: '75', value: 75 },
                  { label: '80', value: 80 },
                  { label: '85', value: 85 },
                  { label: '90', value: 90 },
                  { label: '95', value: 95 },
                ]}
                selectedValue={introSkipTime}
                onChange={handleIntroSkipTimeChange}
                width={100}
              />
            </li>
            {audioTracks.length > 1 && (
              <li className="audio-tracks">
                <span>
                  <FontAwesomeIcon className="i label" icon={faVolumeHigh} />
                  Audio Track
                </span>
                <Select
                  zIndex={14}
                  options={audioTracks.map((track, index) => ({
                    label:
                      (track as any).name ||
                      (track as any).label ||
                      `Track ${index + 1}`,
                    value: index,
                  }))}
                  selectedValue={selectedAudioTrack}
                  onChange={handleAudioChange}
                  width={130}
                />
              </li>
            )}
            <li className="subtitle-style">
              <span>
                <FontAwesomeIcon className="i label" icon={faFont} />
                Subtitle Size
              </span>
              <Select
                zIndex={8}
                options={SUBTITLE_SIZE_OPTIONS.map((o) => ({
                  label: o.label,
                  value: o.value,
                }))}
                selectedValue={(STORE.get('subtitle_size') as string) || 'medium'}
                onChange={handleSubtitleSizeChange}
                width={110}
              />
            </li>
            <li className="subtitle-color">
              <span>
                <FontAwesomeIcon className="i label" icon={faFont} />
                Subtitle Color
              </span>
              <Select
                zIndex={7}
                options={SUBTITLE_COLOR_OPTIONS.map((o) => ({
                  label: o.label,
                  value: o.value,
                }))}
                selectedValue={(STORE.get('subtitle_color') as string) || '#ffffff'}
                onChange={handleSubtitleColorChange}
                width={110}
              />
            </li>
          </div>
        )}
      </div>
    );
  },
);

export default VideoSettings;
