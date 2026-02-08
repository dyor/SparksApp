require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'VideoOverlay'
  s.version        = package['version']
  s.summary        = 'A local module for overlaying images on video'
  s.description    = 'Processes video files by adding image overlays using AVFoundation'
  s.author         = 'Matt Dyor'
  s.homepage       = 'https://example.com'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files   = '**/*.{h,m,swift}'
end
