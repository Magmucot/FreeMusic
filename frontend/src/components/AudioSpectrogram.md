# AudioSpectrogram Component

Универсальный компонент для визуализации аудио спектра в реальном времени.

## Использование

```tsx
import { AudioSpectrogram } from '@/components/AudioSpectrogram';
import { useRef } from 'react';

function MyPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div>
      <audio ref={audioRef} src="/path/to/audio.mp3" />
      
      <AudioSpectrogram
        audioElement={audioRef.current}
        isPlaying={isPlaying}
        barCount={64}
        barColor="#3b82f6"
        barGap={2}
        height={200}
      />
    </div>
  );
}
```

## Props

- `audioElement` (HTMLAudioElement | null) - Ссылка на audio элемент
- `isPlaying` (boolean) - Флаг воспроизведения (для оптимизации)
- `barCount` (number) - Количество полос (по умолчанию 64)
- `barColor` (string) - Цвет полос (по умолчанию '#3b82f6')
- `barGap` (number) - Расстояние между полосами в px (по умолчанию 2)
- `smoothingTimeConstant` (number) - Сглаживание 0-1 (по умолчанию 0.8)
- `minDecibels` (number) - Минимальная громкость в dB (по умолчанию -90)
- `maxDecibels` (number) - Максимальная громкость в dB (по умолчанию -10)
- `height` (number) - Высота в px (по умолчанию 200)
- `className` (string) - CSS класс

## Технические детали

Компонент использует:
- **Web Audio API** для анализа частот
- **Canvas 2D** для отрисовки
- **AnalyserNode** для получения частотных данных
- **requestAnimationFrame** для плавной анимации

Компонент автоматически:
- Подключается к существующему audio элементу
- Останавливает анимацию когда не играет музыка
- Адаптируется под размер контейнера
- Очищает ресурсы при размонтировании
