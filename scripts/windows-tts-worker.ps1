$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech

$utf8 = New-Object System.Text.UTF8Encoding $false
[Console]::InputEncoding = $utf8
[Console]::OutputEncoding = $utf8

$stdin = New-Object System.IO.StreamReader([Console]::OpenStandardInput(), $utf8)
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

$cultureNames = @(
  'en-US',
  'en-GB',
  'ja-JP',
  'zh-CN',
  'zh-TW',
  'ko-KR',
  'fr-FR',
  'de-DE',
  'es-ES',
  'it-IT',
  'pt-BR'
)

function Write-Response($obj) {
  $json = ConvertTo-Json -InputObject $obj -Compress -Depth 8
  [Console]::Out.WriteLine($json)
  [Console]::Out.Flush()
}

function Get-CultureList {
  $list = New-Object System.Collections.Generic.List[object]
  $list.Add($null)
  foreach ($name in $cultureNames) {
    try {
      $list.Add([System.Globalization.CultureInfo]::GetCultureInfo($name))
    } catch {
    }
  }
  try {
    $list.Add([System.Globalization.CultureInfo]::InvariantCulture)
  } catch {
  }
  return $list
}

function Get-VoiceEntries($synthObj) {
  $seen = @{}
  $result = @()
  foreach ($culture in Get-CultureList) {
    try {
      if ($null -eq $culture) {
        $installed = $synthObj.GetInstalledVoices()
      } else {
        $installed = $synthObj.GetInstalledVoices($culture)
      }
      foreach ($voice in $installed) {
        $voiceName = [string]$voice.VoiceInfo.Name
        if ([string]::IsNullOrWhiteSpace($voiceName)) {
          continue
        }
        if ($seen.ContainsKey($voiceName)) {
          continue
        }
        $seen[$voiceName] = $true
        $cultureName = [string]$voice.VoiceInfo.Culture.Name
        $label = $voiceName
        if (-not [string]::IsNullOrWhiteSpace($cultureName)) {
          $label = "$voiceName ($cultureName)"
        }
        $result += @{
          id = $voiceName
          name = $label
        }
      }
    } catch {
    }
  }
  return @($result)
}

function Select-VoiceByName($synthObj, $voiceName) {
  if ([string]::IsNullOrWhiteSpace($voiceName)) {
    return $true
  }

  foreach ($culture in Get-CultureList) {
    try {
      if ($null -eq $culture) {
        $installed = $synthObj.GetInstalledVoices()
      } else {
        $installed = $synthObj.GetInstalledVoices($culture)
      }
      foreach ($voice in $installed) {
        if ([string]$voice.VoiceInfo.Name -eq $voiceName) {
          $synthObj.SelectVoice($voice.VoiceInfo.Name)
          return $true
        }
      }
    } catch {
    }
  }

  foreach ($culture in Get-CultureList) {
    try {
      if ($null -eq $culture) {
        $installed = $synthObj.GetInstalledVoices()
      } else {
        $installed = $synthObj.GetInstalledVoices($culture)
      }
      foreach ($voice in $installed) {
        if ([string]$voice.VoiceInfo.Name -like "*$voiceName*") {
          $synthObj.SelectVoice($voice.VoiceInfo.Name)
          return $true
        }
      }
    } catch {
    }
  }

  return $false
}

function Reset-Synth {
  if ($null -ne $script:synth) {
    try {
      $script:synth.Dispose()
    } catch {
    }
  }
  $script:synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
}

try {
  while ($true) {
    $line = $stdin.ReadLine()
    if ($null -eq $line) {
      break
    }
    if ([string]::IsNullOrWhiteSpace($line)) {
      continue
    }

    $req = $null
    try {
      $req = $line | ConvertFrom-Json
      $id = [string]$req.id
      $cmd = [string]$req.cmd

      if ($cmd -eq 'quit') {
        Write-Response @{ id = $id; ok = $true }
        break
      }

      if ($cmd -eq 'voices') {
        $voices = Get-VoiceEntries $synth
        Write-Response @{ id = $id; ok = $true; voices = @($voices) }
        continue
      }

      if ($cmd -eq 'speak') {
        $text = [string]$req.text
        $out = [string]$req.out
        if ([string]::IsNullOrWhiteSpace($text) -or [string]::IsNullOrWhiteSpace($out)) {
          Write-Response @{ id = $id; ok = $false; error = 'text or out is empty' }
          continue
        }

        Reset-Synth

        if ($null -ne $req.rate) {
          $synth.Rate = [int]$req.rate
        }
        if ($null -ne $req.volume) {
          $synth.Volume = [int]$req.volume
        }

        $voice = [string]$req.voice
        if (-not [string]::IsNullOrWhiteSpace($voice)) {
          $selected = Select-VoiceByName $synth $voice
          if (-not $selected) {
            Write-Response @{ id = $id; ok = $false; error = 'voice not found' }
            continue
          }
        }

        $synth.SetOutputToWaveFile($out)
        $synth.Speak($text)
        $synth.SetOutputToNull()
        Write-Response @{ id = $id; ok = $true }
        continue
      }

      Write-Response @{ id = $id; ok = $false; error = 'unknown command' }
    } catch {
      $message = $_.Exception.Message
      $responseId = '0'
      if ($null -ne $req -and $null -ne $req.id) {
        $responseId = [string]$req.id
      }
      Write-Response @{ id = $responseId; ok = $false; error = $message }
    }
  }
} finally {
  if ($null -ne $synth) {
    $synth.Dispose()
  }
  $stdin.Dispose()
}
