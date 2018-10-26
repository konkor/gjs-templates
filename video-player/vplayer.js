const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gst = imports.gi.Gst;
const GstVideo = imports.gi.GstVideo;
const GdkX11 = imports.gi.GdkX11;
const Lang = imports.lang;

var CustomApplication = new Lang.Class ({
    Name: "CustomApplication",
    Extends: Gtk.Application,

    _init: function (args) {
        GLib.set_prgname ("custom-application");
        this.parent ({
            application_id: "org.konkor.template.application",
            flags: Gio.ApplicationFlags.HANDLES_OPEN
        });
        GLib.set_application_name ("Custom GTK Application");
    },

    vfunc_startup: function() {
        this.parent();
        this.window = new Gtk.Window ();
        this.window.set_icon_name ("org.konkor.custom");
        this.add_window (this.window);
        this.build ();
    },

    vfunc_activate: function() {
        this.window.show_all ();
        this.window.present ();
    },

    build: function() {
        this.window.set_default_size (512, 320);
        this.handler = 0;
        this.window.connect ('realize', Lang.bind (this, (o)=>{
            this.handler = o.window.get_xid ();
            this.play ();
        }));
        Gst.init(null, 0);
        this.playbin = Gst.ElementFactory.make("playbin", null);
        this.audiosink = Gst.ElementFactory.make("pulsesink", "audiosink");
        this.playbin.set_property("audio-sink", this.audiosink);
        this.videosink = Gst.ElementFactory.make("xvimagesink", "videosink");
        this.playbin.set_property("video-sink", this.videosink);
        
        this.bus = this.playbin.get_bus();
        this.bus.add_signal_watch();
        this.bus.connect ("message", Lang.bind (this, (bus, msg) => {
            if (msg) this.on_bus_message (msg);
        }));
    },

    on_bus_message: function (msg) {
        //TODO Process messages
        //print (msg.type);
        if(GstVideo.is_video_overlay_prepare_window_handle_message (msg)) {
            var overlay = msg.src;
			if (!overlay) return false;
			print ("Seet overlay...", msg.type, this.handler);
			overlay.set_window_handle (this.handler);
		}
		return true;
    },

    play: function () {
        this.playbin.set_property ("uri", Gio.File.new_for_path ("/home/kapa/projects/gjs-templates/video-player/test.mp4").get_uri());
        this.playbin.set_state(Gst.State.READY);
        this.playbin.set_state(Gst.State.PLAYING);
    }
});

let app = new CustomApplication (ARGV);
app.run (ARGV);
