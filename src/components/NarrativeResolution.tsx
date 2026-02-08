import { Trophy, Clock, Brain } from "lucide-react";

interface NarrativeResolutionProps {
  resolution: string;
  quizScore: { correct: number; total: number };
  timeSpent: number;
  onExit: () => void;
}

export function NarrativeResolution({
  resolution,
  quizScore,
  timeSpent,
  onExit,
}: NarrativeResolutionProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="max-w-lg">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-nvidia-green/20 flex items-center justify-center">
          <Trophy className="w-8 h-8 text-nvidia-green" />
        </div>

        <h2 className="text-2xl font-bold text-nvidia-green mb-4">
          Mission Complete
        </h2>

        <p className="text-gray-300 mb-8 leading-relaxed">{resolution}</p>

        {/* Stats */}
        <div className="flex justify-center gap-8 mb-8">
          <div className="text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-gray-400" />
            <div className="text-lg font-bold text-white">{timeSpent}m</div>
            <div className="text-xs text-gray-400">Time</div>
          </div>
          {quizScore.total > 0 && (
            <div className="text-center">
              <Brain className="w-5 h-5 mx-auto mb-1 text-gray-400" />
              <div className="text-lg font-bold text-white">
                {quizScore.correct}/{quizScore.total}
              </div>
              <div className="text-xs text-gray-400">Quiz Score</div>
            </div>
          )}
        </div>

        <button
          onClick={onExit}
          className="px-8 py-3 bg-nvidia-green text-black font-bold rounded-lg hover:bg-nvidia-darkgreen transition-colors"
        >
          Exit Mission
        </button>
      </div>
    </div>
  );
}
